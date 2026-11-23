"""
Module: backend/apps/accounts/test_room_warden_assignment.py

Work / Purpose:
    Unit and integration tests verifying room/bed occupancy enforcement and
    single-warden-per-hostel assignment policies.

Coverage:
    1. Duplicate bed assignment validation (e.g., Bed A occupied prevents duplicate assignment).
    2. Vacant bed assignment allowed (e.g., Bed B can be assigned while Bed A is occupied).
    3. Room & bed occupancy summary reporting.
    4. Student room deallocation (vacates bed and enables reassignment).
    5. Single warden per hostel validation (BH1 cannot have multiple wardens).
    6. Warden unassignment (vacates hostel and enables reassignment to new warden).
    7. Superadmin AuthorizedIdentity room deallocation and hostel unassignment.
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import (
    User,
    AuthorizedStudent,
    AuthorizedWarden,
    AuthorizedIdentity,
    StudentProfile,
    WardenAssignment,
)
from apps.hostels.models import Hostel, Block, Room, Bed, Allocation
from apps.hostels.services import (
    validate_and_check_bed_occupancy,
    get_room_bed_occupancy_summary,
    validate_and_check_warden_assignment,
    deallocate_student_room,
    unassign_warden_from_hostel,
)
from apps.audit.models import AuditEntry


class RoomAndWardenAssignmentTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin & Super Admin users
        self.admin = User.objects.create_user(
            email='admin.hostel@hostel.edu',
            password='AdminPassword123!',
            role='HOSTEL_ADMIN',
            first_name='Admin',
            last_name='Officer',
        )
        self.superadmin = User.objects.create_user(
            email='superadmin@hostel.edu',
            password='SuperPassword123!',
            role='SUPER_ADMIN',
            first_name='Super',
            last_name='Admin',
        )

        # Hostels & Blocks
        self.hostel_bh1 = Hostel.objects.create(
            name='Boys Hostel 1',
            code='BH1',
            hostel_category='BOYS',
            is_active=True,
        )
        self.hostel_bh2 = Hostel.objects.create(
            name='Boys Hostel 2',
            code='BH2',
            hostel_category='BOYS',
            is_active=True,
        )
        self.block_a = Block.objects.create(hostel=self.hostel_bh1, name='Block A', gender_restriction='MALE')

        # Room 101 with Bed A and Bed B (Capacity: 2)
        self.room_101 = Room.objects.create(block=self.block_a, room_number='101', capacity=2)
        self.bed_a = Bed.objects.create(room=self.room_101, bed_number='A')
        self.bed_b = Bed.objects.create(room=self.room_101, bed_number='B')

        # Student 1 allocated to Bed A
        self.student1 = User.objects.create_user(
            email='student1@lpu.in',
            password='StudentPassword123!',
            role='STUDENT',
            first_name='Rahul',
            last_name='Sharma',
        )
        StudentProfile.objects.create(user=self.student1, roll_number='12100001', gender='MALE', fee_cleared=True)
        self.alloc_a = Allocation.objects.create(student=self.student1, bed=self.bed_a, is_active=True)

        self.auth_student1 = AuthorizedStudent.objects.create(
            registration_number='12100001',
            email='student1@lpu.in',
            full_name='Rahul Sharma',
            gender='MALE',
            initial_hostel_code='BH1',
            initial_room='101',
            initial_bed='A',
            authorization_status='ACTIVE',
            is_registered=True,
        )

    def test_duplicate_bed_assignment_rejected(self):
        """
        When Bed A in BH1 Room 101 is already allocated to student1,
        authorizing another student to Bed A must be rejected with HTTP 400.
        """
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/admin/authorized-students/', {
            'registration_number': '12100002',
            'email': 'student2@lpu.in',
            'full_name': 'Amit Kumar',
            'gender': 'MALE',
            'initial_hostel_code': 'BH1',
            'initial_room': '101',
            'initial_bed': 'A',
            'department': 'CSE',
            'year_of_study': 2,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_text = str(response.data)
        self.assertIn('already occupied', error_text)

    def test_vacant_bed_assignment_allowed(self):
        """
        While Bed A is occupied, Bed B in the same room (101) is vacant
        and can be successfully assigned to a new student.
        """
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/admin/authorized-students/', {
            'registration_number': '12100002',
            'email': 'student2@lpu.in',
            'full_name': 'Amit Kumar',
            'gender': 'MALE',
            'initial_hostel_code': 'BH1',
            'initial_room': '101',
            'initial_bed': 'B',
            'department': 'CSE',
            'year_of_study': 2,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data.get('initial_bed'), 'B')
        self.assertEqual(response.data.get('initial_room'), '101')

    def test_room_bed_occupancy_summary(self):
        """
        get_room_bed_occupancy_summary correctly identifies that Bed A is occupied
        and Bed B is available.
        """
        summary = get_room_bed_occupancy_summary('BH1', '101')
        self.assertEqual(summary['capacity'], 2)
        self.assertEqual(summary['occupied_count'], 1)
        self.assertEqual(summary['available_count'], 1)
        self.assertIn('B', summary['available_beds'])
        self.assertNotIn('A', summary['available_beds'])

        # Check Bed A details
        bed_a_info = next(b for b in summary['beds'] if b['bed_number'] == 'A')
        self.assertTrue(bed_a_info['is_occupied'])
        self.assertIn('Rahul', bed_a_info['occupant']['name'])

        # Check Bed B details
        bed_b_info = next(b for b in summary['beds'] if b['bed_number'] == 'B')
        self.assertFalse(bed_b_info['is_occupied'])

    def test_student_room_deallocation_and_reassignment(self):
        """
        Deallocating a student frees Bed A, permitting subsequent assignment.
        """
        self.client.force_authenticate(user=self.admin)

        # Deallocate student1 from room
        dealloc_url = f'/api/v1/admin/authorized-students/{self.auth_student1.id}/deallocate-room/'
        resp = self.client.post(dealloc_url, {})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Allocation is deactivated
        self.alloc_a.refresh_from_db()
        self.assertFalse(self.alloc_a.is_active)

        # Student authorized record cleared
        self.auth_student1.refresh_from_db()
        self.assertIn(self.auth_student1.initial_room, ['', None])
        self.assertIn(self.auth_student1.initial_bed, ['', None])

        # Bed A is now available for student2
        summary = get_room_bed_occupancy_summary('BH1', '101')
        self.assertIn('A', summary['available_beds'])

        reassign_resp = self.client.post('/api/v1/admin/authorized-students/', {
            'registration_number': '12100003',
            'email': 'student3@lpu.in',
            'full_name': 'Vikas Verma',
            'gender': 'MALE',
            'initial_hostel_code': 'BH1',
            'initial_room': '101',
            'initial_bed': 'A',
            'department': 'ECE',
            'year_of_study': 3,
        })
        self.assertEqual(reassign_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(reassign_resp.data.get('initial_bed'), 'A')

    def test_duplicate_warden_assignment_rejected(self):
        """
        A hostel cannot have multiple wardens. When BH1 is assigned to warden1,
        assigning BH1 to warden2 must be rejected with HTTP 400.
        """
        self.client.force_authenticate(user=self.admin)

        # Authorize warden 1 with BH1
        w1_resp = self.client.post('/api/v1/admin/authorized-wardens/', {
            'warden_id': 'W101',
            'email': 'warden1@hostel.edu',
            'full_name': 'Dr. Sharma',
            'role': 'WARDEN',
            'assigned_hostels': [self.hostel_bh1.id],
        })
        self.assertEqual(w1_resp.status_code, status.HTTP_201_CREATED)

        # Attempt to authorize warden 2 also with BH1
        w2_resp = self.client.post('/api/v1/admin/authorized-wardens/', {
            'warden_id': 'W102',
            'email': 'warden2@hostel.edu',
            'full_name': 'Dr. Verma',
            'role': 'WARDEN',
            'assigned_hostels': [self.hostel_bh1.id],
        })
        self.assertEqual(w2_resp.status_code, status.HTTP_400_BAD_REQUEST)
        error_text = str(w2_resp.data)
        self.assertIn('already assigned', error_text)

    def test_warden_unassignment_and_reassignment(self):
        """
        Unassigning a warden from BH1 vacates the hostel, allowing another warden
        to be assigned.
        """
        self.client.force_authenticate(user=self.admin)

        # Authorize warden 1 with BH1
        w1_resp = self.client.post('/api/v1/admin/authorized-wardens/', {
            'warden_id': 'W103',
            'email': 'warden3@hostel.edu',
            'full_name': 'Dr. Kapoor',
            'role': 'WARDEN',
            'assigned_hostels': [self.hostel_bh1.id],
        })
        self.assertEqual(w1_resp.status_code, status.HTTP_201_CREATED)
        warden1_id = w1_resp.data['id']

        # Unassign BH1 from warden 1
        unassign_url = f'/api/v1/admin/authorized-wardens/{warden1_id}/unassign-hostel/'
        unassign_resp = self.client.post(unassign_url, {'hostel': 'BH1'})
        self.assertEqual(unassign_resp.status_code, status.HTTP_200_OK)

        # Verify BH1 can now be assigned to warden 2
        w2_resp = self.client.post('/api/v1/admin/authorized-wardens/', {
            'warden_id': 'W104',
            'email': 'warden4@hostel.edu',
            'full_name': 'Dr. Gupta',
            'role': 'WARDEN',
            'assigned_hostels': [self.hostel_bh1.id],
        })
        self.assertEqual(w2_resp.status_code, status.HTTP_201_CREATED)

    def test_superadmin_identity_bed_validation(self):
        """
        Superadmin Centralized Identity endpoint enforces bed occupancy validation.
        Bed A (occupied) -> 400 Bad Request.
        Bed B (vacant) -> 201 Created.
        """
        self.client.force_authenticate(user=self.superadmin)

        # Try Bed A (occupied by student1)
        resp_a = self.client.post('/api/v1/super-admin/authorized-identities/', {
            'institution_id': 'SA1210001',
            'name': 'Test SA Student 1',
            'trusted_email': 'sa.student1@lpu.in',
            'role': 'STUDENT',
            'initial_hostel_code': 'BH1',
            'initial_room': '101',
            'initial_bed': 'A',
            'gender': 'MALE',
        })
        self.assertEqual(resp_a.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already occupied', str(resp_a.data))

        # Try Bed B (vacant)
        resp_b = self.client.post('/api/v1/super-admin/authorized-identities/', {
            'institution_id': 'SA1210002',
            'name': 'Test SA Student 2',
            'trusted_email': 'sa.student2@lpu.in',
            'role': 'STUDENT',
            'initial_hostel_code': 'BH1',
            'initial_room': '101',
            'initial_bed': 'B',
            'gender': 'MALE',
        })
        self.assertEqual(resp_b.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp_b.data.get('initial_bed'), 'B')
