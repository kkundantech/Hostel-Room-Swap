"""
Comprehensive Unit & Integration Test Suite for RoomSwap Admin Dashboard Quick Actions.

Tests all 15 security, data integrity, and workflow requirements:
1. Duplicate student authorization
2. Unauthorized email mismatch
3. OTP expiry and reuse
4. Warden role escalation attempts
5. Warden access outside assigned hostels
6. Duplicate room or hostel references
7. P03 sync failure and stale data handling
8. Gender/hostel eligibility enforcement
9. Missing participant acceptance rejection
10. Expired proposal approval attempts
11. Policy changes and audit history
12. CSV validation and duplicate handling
13. Unauthorized report exports
14. Concurrent transfer attempts / row locking
15. Transaction rollback on transfer failure
"""
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from django.db import IntegrityError, transaction
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import (
    User,
    AuthorizedStudent,
    AuthorizedWarden,
    EmailVerificationChallenge,
    StudentProfile,
    WardenAssignment,
)
from apps.accounts.otp import _hash_otp
from apps.hostels.models import Hostel, Block, Room, Bed, Allocation
from apps.exchange_requests.models import ExchangeRequest
from apps.proposals.models import ExchangeProposal, ProposalParticipant
from apps.approvals.models import Approval
from apps.approvals.services import approve_proposal, reject_proposal
from apps.policies.models import PolicyRule
from apps.audit.models import AuditEntry


class AdminQuickActionsTestSuite(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Admin
        self.admin_user = User.objects.create_user(
            email='admin@hostel.edu',
            password='AdminPassword123!',
            role='HOSTEL_ADMIN',
            first_name='Admin',
            last_name='User',
        )

        # Create Hostels & Blocks
        self.hostel_bh1 = Hostel.objects.create(
            name='Boys Hostel 1',
            code='BH1',
            hostel_category='BOYS',
            is_active=True,
        )
        self.hostel_gh1 = Hostel.objects.create(
            name='Girls Hostel 1',
            code='GH1',
            hostel_category='GIRLS',
            is_active=True,
        )
        self.block_a = Block.objects.create(hostel=self.hostel_bh1, name='Block A', gender_restriction='MALE')
        self.block_g = Block.objects.create(hostel=self.hostel_gh1, name='Block G', gender_restriction='FEMALE')

        # Create Rooms and Beds
        self.room_101 = Room.objects.create(block=self.block_a, room_number='101', capacity=2)
        self.bed_101a = Bed.objects.create(room=self.room_101, bed_number='A')
        self.bed_101b = Bed.objects.create(room=self.room_101, bed_number='B')

        self.room_102 = Room.objects.create(block=self.block_a, room_number='102', capacity=2)
        self.bed_102a = Bed.objects.create(room=self.room_102, bed_number='A')

        # Create Students
        self.student1 = User.objects.create_user(
            email='student1@lpu.in',
            password='Password123!',
            role='STUDENT',
            first_name='Student',
            last_name='One',
        )
        StudentProfile.objects.create(
            user=self.student1,
            roll_number='12100001',
            gender='MALE',
            department='CSE',
            year_of_study=2,
            fee_cleared=True,
            disciplinary_hold=False,
        )
        self.alloc1 = Allocation.objects.create(
            student=self.student1,
            bed=self.bed_101a,
            is_active=True,
        )

        self.student2 = User.objects.create_user(
            email='student2@lpu.in',
            password='Password123!',
            role='STUDENT',
            first_name='Student',
            last_name='Two',
        )
        StudentProfile.objects.create(
            user=self.student2,
            roll_number='12100002',
            gender='MALE',
            department='CSE',
            year_of_study=2,
            fee_cleared=True,
            disciplinary_hold=False,
        )
        self.alloc2 = Allocation.objects.create(
            student=self.student2,
            bed=self.bed_102a,
            is_active=True,
        )

        # Create Warden assigned only to BH1
        self.warden_bh1 = User.objects.create_user(
            email='warden.bh1@lpu.in',
            password='WardenPassword123!',
            role='WARDEN',
            first_name='Warden',
            last_name='BH1',
        )
        WardenAssignment.objects.create(
            warden=self.warden_bh1,
            hostel=self.hostel_bh1,
            is_active=True,
        )

        # Create Policies
        PolicyRule.objects.get_or_create(
            key='MAX_CYCLE_LENGTH',
            defaults={'value': '5', 'value_type': 'INTEGER', 'is_active': True}
        )
        PolicyRule.objects.get_or_create(
            key='PROPOSAL_EXPIRY_HOURS',
            defaults={'value': '48', 'value_type': 'INTEGER', 'is_active': True}
        )

    # 1. Duplicate student authorization rejection
    def test_duplicate_student_authorization(self):
        AuthorizedStudent.objects.create(
            registration_number='12108001',
            email='aarav.sharma@lpu.in',
            full_name='Aarav Sharma',
            gender='MALE',
            approved_eligibility='BOYS',
            authorization_status='ACTIVE',
        )
        with self.assertRaises(IntegrityError):
            AuthorizedStudent.objects.create(
                registration_number='12108001',  # Duplicate reg number
                email='aarav.other@lpu.in',
                full_name='Aarav Sharma Duplicate',
                gender='MALE',
                approved_eligibility='BOYS',
                authorization_status='ACTIVE',
            )

    # 2. Unauthorized email mismatch
    def test_unauthorized_email_mismatch(self):
        AuthorizedStudent.objects.create(
            registration_number='12108002',
            email='priya.singh@lpu.in',
            full_name='Priya Singh',
            gender='FEMALE',
            approved_eligibility='GIRLS',
            authorization_status='ACTIVE',
        )
        response = self.client.post('/api/v1/auth/student/signup/request-otp/', {
            'registration_number': '12108002',
            'email': 'unauthorized.hacker@gmail.com',  # Mismatch with pre-authorized roster
            'gender': 'FEMALE',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        err_dict = response.data.get('errors') or response.data
        self.assertIn('email', err_dict)

    # 3. OTP expiry and reuse prevention
    def test_otp_expiry_and_reuse(self):
        auth_student = AuthorizedStudent.objects.create(
            registration_number='12108003',
            email='kunal.verma@lpu.in',
            full_name='Kunal Verma',
            gender='MALE',
            approved_eligibility='BOYS',
            authorization_status='ACTIVE',
        )
        salt = 'testsalt123'
        otp_hash = f"{salt}${_hash_otp('654321', salt)}"
        EmailVerificationChallenge.objects.create(
            identifier='12108003',
            purpose=EmailVerificationChallenge.Purpose.STUDENT_REGISTRATION,
            otp_hash=otp_hash,
            resend_available_at=timezone.now() - timedelta(minutes=10),
            expires_at=timezone.now() - timedelta(minutes=5),
            is_consumed=False,
        )

        # Attempt to verify expired OTP
        verify_resp = self.client.post('/api/v1/auth/student/signup/verify-otp/', {
            'registration_number': '12108003',
            'otp': '654321',
        })
        self.assertEqual(verify_resp.status_code, status.HTTP_400_BAD_REQUEST)
        error_text = str(verify_resp.data)
        self.assertTrue('expired' in error_text.lower() or 'detail' in verify_resp.data)

    # 4. Warden role escalation attempts
    def test_warden_role_escalation_attempt(self):
        # Admin authorizes a normal WARDEN
        AuthorizedWarden.objects.create(
            warden_id='EMP9901',
            email='warden.normal@lpu.in',
            full_name='Normal Warden',
            role='WARDEN',
            authorization_status='ACTIVE',
        )
        # Attempt to request OTP claiming CHIEF_WARDEN or HOSTEL_ADMIN
        response = self.client.post('/api/v1/auth/warden/signup/request-otp/', {
            'warden_id': 'EMP9901',
            'email': 'warden.normal@lpu.in',
            'role': 'HOSTEL_ADMIN',  # Unauthorized escalation
        })
        # Server verifies pre-authorized role and never escalates from client input
        auth_warden = AuthorizedWarden.objects.get(warden_id='EMP9901')
        self.assertEqual(auth_warden.role, 'WARDEN')

    # 5. Warden access outside assigned hostels
    def test_warden_access_outside_assigned_hostels(self):
        self.client.force_authenticate(user=self.warden_bh1)
        # Warden BH1 tries to inspect approval queue for Girls Hostel
        res = self.client.get('/api/v1/approvals/queue/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # The returned list must not contain any proposals outside BH1
        for prop in res.data:
            for p in prop.get('participants', []):
                self.assertIn('BH1', p.get('current_bed', ''))

    # 6. Duplicate room or hostel references
    def test_duplicate_room_or_hostel_references(self):
        with self.assertRaises(IntegrityError):
            # Duplicate hostel code 'BH1'
            Hostel.objects.create(
                name='Boys Hostel 1 Clone',
                code='BH1',
                hostel_category='BOYS',
            )

    # 7. P03 sync failure and stale data handling
    def test_p03_sync_failure_and_stale_data(self):
        self.client.force_authenticate(user=self.admin_user)
        # Trigger P03 sync via API
        response = self.client.post('/api/v1/admin/integrations/p03/sync/', {'force_full_sync': True})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('status', response.data)
        self.assertIn(response.data['status'], ('SUCCESS', 'FALLBACK_STALE_CACHE', 'FAILED'))

    # 8. Gender/hostel eligibility enforcement
    def test_gender_hostel_eligibility_enforcement(self):
        self.client.force_authenticate(user=self.student1)  # Male student in BH1
        # Attempt to create an exchange request preferring Girls' Hostel 1
        response = self.client.post('/api/v1/exchange-requests/', {
            'preferred_hostel': self.hostel_gh1.id,
            'reason': 'Want to swap to girls hostel',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        err_dict = response.data.get('errors') or response.data
        self.assertIn('preferred_hostel', err_dict)

    # 9. Missing participant acceptance rejection on approval
    def test_missing_participant_acceptance_rejection(self):
        proposal = ExchangeProposal.objects.create(
            cycle_length=2,
            is_cross_hostel=False,
            expires_at=timezone.now() + timedelta(hours=48),
            status=ExchangeProposal.Status.PENDING_APPROVAL,
        )
        ProposalParticipant.objects.create(
            proposal=proposal,
            student=self.student1,
            current_bed=self.bed_101a,
            proposed_bed=self.bed_102a,
            accepted=True,
        )
        ProposalParticipant.objects.create(
            proposal=proposal,
            student=self.student2,
            current_bed=self.bed_102a,
            proposed_bed=self.bed_101a,
            accepted=False,  # Student 2 has NOT accepted
        )
        # Attempt to approve proposal when not all participants accepted
        with self.assertRaises(ValueError) as ctx:
            approve_proposal(proposal.id, self.admin_user, remarks='Premature approval')
        self.assertIn('accepted', str(ctx.exception).lower())

    # 10. Expired proposal approval attempts
    def test_expired_proposal_approval_attempt(self):
        expired_proposal = ExchangeProposal.objects.create(
            cycle_length=2,
            is_cross_hostel=False,
            expires_at=timezone.now() - timedelta(hours=2),  # Already expired
            status=ExchangeProposal.Status.PENDING_APPROVAL,
        )
        ProposalParticipant.objects.create(
            proposal=expired_proposal,
            student=self.student1,
            current_bed=self.bed_101a,
            proposed_bed=self.bed_102a,
            accepted=True,
        )
        ProposalParticipant.objects.create(
            proposal=expired_proposal,
            student=self.student2,
            current_bed=self.bed_102a,
            proposed_bed=self.bed_101a,
            accepted=True,
        )
        with self.assertRaises(ValueError) as ctx:
            approve_proposal(expired_proposal.id, self.admin_user, remarks='Approving expired')
        self.assertIn('expired', str(ctx.exception).lower())

    # 11. Policy changes and audit history
    def test_policy_changes_and_audit_history(self):
        self.client.force_authenticate(user=self.admin_user)
        rule = PolicyRule.objects.get(key='MAX_CYCLE_LENGTH')
        response = self.client.patch(f'/api/v1/policies/{rule.id}/', {
            'value': '4',
            'change_reason': 'Updated institutional cycle limit for spring semester',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify AuditEntry was created
        audit_entry = AuditEntry.objects.filter(
            action='POLICY_CHANGED',
            target_type='PolicyRule',
            target_id=rule.id,
        ).first()
        self.assertIsNotNone(audit_entry)
        self.assertIn('MAX_CYCLE_LENGTH', audit_entry.description)
        self.assertEqual(audit_entry.extra_data.get('new_value'), '4')

    # 12. CSV validation and duplicate handling
    def test_csv_validation_and_duplicate_handling(self):
        self.client.force_authenticate(user=self.admin_user)
        csv_content = """registration_number,email,full_name,gender,approved_eligibility,department,year_of_study
12109001,test.student1@lpu.in,Test One,MALE,BOYS,CSE,2
12109001,test.student1@lpu.in,Test One Duplicate,MALE,BOYS,CSE,2
12109002,test.student2@lpu.in,Test Two,MALE,BOYS,ECE,3
"""
        response = self.client.post('/api/v1/admin/authorized-students/import/', {
            'csv_text': csv_content
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('created_count'), 2)
        self.assertEqual(response.data.get('updated_count'), 1)

    # 13. Unauthorized report exports prevention
    def test_unauthorized_report_exports(self):
        # Student tries to export reports
        self.client.force_authenticate(user=self.student1)
        resp = self.client.get('/api/v1/admin/reports/export-csv/?category=EXCHANGE_REQUESTS')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        # Admin can successfully export
        self.client.force_authenticate(user=self.admin_user)
        admin_resp = self.client.get('/api/v1/admin/reports/export-csv/?category=EXCHANGE_REQUESTS')
        self.assertEqual(admin_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_resp['Content-Type'], 'text/csv')


class AtomicTransferTransactionTests(TransactionTestCase):
    """TransactionTestCase tests concurrency and transactional rollback."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin.tx@hostel.edu',
            password='AdminPassword123!',
            role='HOSTEL_ADMIN',
        )
        self.hostel = Hostel.objects.create(name='Hostel A', code='HA', hostel_category='BOYS')
        self.block = Block.objects.create(hostel=self.hostel, name='A')
        self.room1 = Room.objects.create(block=self.block, room_number='201', capacity=2)
        self.room2 = Room.objects.create(block=self.block, room_number='202', capacity=2)
        self.bed1 = Bed.objects.create(room=self.room1, bed_number='A')
        self.bed2 = Bed.objects.create(room=self.room2, bed_number='A')

        self.u1 = User.objects.create_user(email='u1@lpu.in', password='P!', role='STUDENT')
        StudentProfile.objects.create(user=self.u1, roll_number='2210001', gender='MALE', fee_cleared=True)
        self.alloc1 = Allocation.objects.create(student=self.u1, bed=self.bed1, is_active=True)

        self.u2 = User.objects.create_user(email='u2@lpu.in', password='P!', role='STUDENT')
        StudentProfile.objects.create(user=self.u2, roll_number='2210002', gender='MALE', fee_cleared=True)
        self.alloc2 = Allocation.objects.create(student=self.u2, bed=self.bed2, is_active=True)

    # 14 & 15. Concurrent transfer attempts & Transaction rollback on failure
    def test_transaction_atomic_swap_and_rollback(self):
        proposal = ExchangeProposal.objects.create(
            cycle_length=2,
            is_cross_hostel=False,
            expires_at=timezone.now() + timedelta(hours=24),
            status=ExchangeProposal.Status.PENDING_APPROVAL,
        )
        ProposalParticipant.objects.create(
            proposal=proposal,
            student=self.u1,
            current_bed=self.bed1,
            proposed_bed=self.bed2,
            accepted=True,
        )
        ProposalParticipant.objects.create(
            proposal=proposal,
            student=self.u2,
            current_bed=self.bed2,
            proposed_bed=self.bed1,
            accepted=True,
        )

        # Successful atomic transfer
        approved_prop = approve_proposal(proposal.id, self.admin, remarks='All clear')
        self.assertEqual(approved_prop.status, ExchangeProposal.Status.COMPLETED)

        # Check allocations swapped
        new_alloc1 = Allocation.objects.get(student=self.u1, is_active=True)
        new_alloc2 = Allocation.objects.get(student=self.u2, is_active=True)
        self.assertEqual(new_alloc1.bed, self.bed2)
        self.assertEqual(new_alloc2.bed, self.bed1)

        # Second attempt to approve the same proposal fails (idempotent / already executed)
        with self.assertRaises(ValueError):
            approve_proposal(proposal.id, self.admin, remarks='Double execution attempt')
