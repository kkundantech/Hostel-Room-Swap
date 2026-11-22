"""
Test vacant room change request approval and rejection endpoints.
"""
import pytest
from rest_framework.test import APIClient
from django.utils import timezone

from apps.accounts.models import User, WardenAssignment, StudentProfile
from apps.hostels.models import Hostel, Block, Room, Bed, Allocation
from apps.exchange_requests.models import ExchangeRequest
from apps.transfers.models import TransferRecord
from apps.notifications.models import Notification
from apps.notifications.services import notify_staff_request_raised


@pytest.mark.django_db
class TestVacantRoomApproval:
    def setup_method(self):
        # 1. Create Hostel, Block, Room, Beds
        self.hostel = Hostel.objects.create(
            name="Boys Hostel 1",
            code="BH1",
            hostel_category="BOYS",
        )
        self.block = Block.objects.create(
            hostel=self.hostel,
            name="A",
            gender_restriction="MALE",
        )
        self.room1 = Room.objects.create(
            block=self.block,
            room_number="101",
            floor=1,
            capacity=2,
        )
        self.bed1_a = Bed.objects.create(room=self.room1, bed_number="A")
        self.bed1_b = Bed.objects.create(room=self.room1, bed_number="B")

        self.room2 = Room.objects.create(
            block=self.block,
            room_number="102",
            floor=1,
            capacity=2,
        )
        self.bed2_a = Bed.objects.create(room=self.room2, bed_number="A")
        self.bed2_b = Bed.objects.create(room=self.room2, bed_number="B")

        # 2. Create Warden
        self.warden = User.objects.create_user(
            email="warden.bh1@hostel.edu",
            password="WardenPassword123!",
            role="WARDEN",
            first_name="Hostel",
            last_name="Warden",
        )
        WardenAssignment.objects.create(
            warden=self.warden,
            hostel=self.hostel,
            is_active=True,
        )

        # 3. Create Student
        self.student = User.objects.create_user(
            email="student1@hostel.edu",
            password="StudentPassword123!",
            role="STUDENT",
            first_name="ABC",
            last_name="Resident",
            registration_number="11111112",
        )
        StudentProfile.objects.create(
            user=self.student,
            roll_number="11111112",
            gender="MALE",
            year_of_study=2,
            department="Computer Science",
        )

        # 4. Allocate Student to bed1_a
        self.alloc = Allocation.objects.create(
            student=self.student,
            bed=self.bed1_a,
            is_active=True,
            reason="Initial Allocation",
        )

        # 5. Create Exchange Request (student requests room change to vacant bed2_a)
        self.req = ExchangeRequest.objects.create(
            student=self.student,
            current_bed=self.bed1_a,
            preferred_hostel=self.hostel,
            preferred_bed=self.bed2_a,
            reason="I want to move to room 102 (vacant)",
            status=ExchangeRequest.Status.OPEN,
            is_eligible=True,
            expires_at=timezone.now() + timezone.timedelta(days=14),
        )

        self.client = APIClient()

    def test_vacant_beds_endpoint(self):
        self.client.force_authenticate(user=self.warden)
        res = self.client.get("/api/v1/beds/vacant/")
        assert res.status_code == 200
        vacant_ids = [b["id"] for b in res.data]
        # bed1_a is occupied, bed1_b, bed2_a, bed2_b are vacant
        assert self.bed1_a.id not in vacant_ids
        assert self.bed1_b.id in vacant_ids
        assert self.bed2_a.id in vacant_ids
        assert self.bed2_b.id in vacant_ids

    def test_warden_approve_vacant_room_request(self):
        self.client.force_authenticate(user=self.warden)
        res = self.client.post(
            f"/api/v1/exchange-requests/{self.req.id}/approve/",
            {"target_bed_id": self.bed2_a.id, "remarks": "Approved room change"},
        )
        assert res.status_code == 200
        assert res.data["status"] == "SUCCESS"

        # Check request status
        self.req.refresh_from_db()
        assert self.req.status == ExchangeRequest.Status.COMPLETED

        # Check old allocation is deactivated
        self.alloc.refresh_from_db()
        assert not self.alloc.is_active

        # Check new allocation exists
        new_alloc = Allocation.objects.filter(student=self.student, is_active=True).first()
        assert new_alloc is not None
        assert new_alloc.bed == self.bed2_a

        # Check TransferRecord was created
        transfer = TransferRecord.objects.filter(student=self.student).first()
        assert transfer is not None
        assert transfer.old_bed == self.bed1_a
        assert transfer.new_bed == self.bed2_a
        assert transfer.approved_by == self.warden

    def test_warden_reject_vacant_room_request(self):
        self.client.force_authenticate(user=self.warden)
        res = self.client.post(
            f"/api/v1/exchange-requests/{self.req.id}/reject/",
            {"reason": "Hostel capacity restrictions"},
        )
        assert res.status_code == 200
        assert res.data["status"] == "SUCCESS"

        self.req.refresh_from_db()
        assert self.req.status == ExchangeRequest.Status.CANCELLED
        assert self.req.last_validation.get("rejection_reason") == "Hostel capacity restrictions"

        # Allocation remains unchanged
        self.alloc.refresh_from_db()
        assert self.alloc.is_active
        assert self.alloc.bed == self.bed1_a

    def test_student_request_dispatches_notifications_to_warden_and_admin(self):
        # Create an admin
        admin_user = User.objects.create_user(
            email="admin.staff@hostel.edu",
            password="AdminPassword123!",
            role=User.Role.HOSTEL_ADMIN,
            first_name="Campus",
            last_name="Administrator",
        )

        # Notify staff of request
        notify_staff_request_raised(self.req)

        # Verify warden received the notification
        warden_notifs = Notification.objects.filter(recipient=self.warden)
        assert warden_notifs.exists()
        w_notif = warden_notifs.first()
        assert w_notif.notif_type == Notification.NotifType.APPROVAL_NEEDED
        assert "ABC" in w_notif.title or "ABC" in w_notif.message
        assert w_notif.related_type == "ExchangeRequest"
        assert w_notif.related_id == self.req.id

        # Verify admin received the notification
        admin_notifs = Notification.objects.filter(recipient=admin_user)
        assert admin_notifs.exists()
        a_notif = admin_notifs.first()
        assert a_notif.notif_type == Notification.NotifType.APPROVAL_NEEDED
        assert a_notif.related_type == "ExchangeRequest"
        assert a_notif.related_id == self.req.id

        # Verify student themselves is NOT in the staff notification recipients
        student_staff_notifs = Notification.objects.filter(
            recipient=self.student,
            notif_type=Notification.NotifType.APPROVAL_NEEDED,
        )
        assert not student_staff_notifs.exists()

    def test_student_requests_unavailable_floor_receives_warning(self):
        # Student currently has an active request in setup_method, so delete it first
        self.req.delete()

        self.client.force_authenticate(user=self.student)
        res = self.client.post(
            "/api/v1/exchange-requests/",
            {
                "preferred_hostel": self.hostel.id,
                "preferred_floor": "4th Floor",
                "reason": "I want quiet room [Preference: 2 Seater, 4th Floor]",
            },
            format="json",
        )
        assert res.status_code == 201
        assert "floor_warning" in res.data
        assert "Currently it is not available, maybe in future you can try." in res.data["floor_warning"]

    def test_destination_warden_can_see_cross_hostel_request(self):
        # Create BH2 and assign a warden to BH2
        from apps.hostels.models import Hostel, Block, Room, Bed
        from apps.accounts.models import WardenAssignment
        hostel2 = Hostel.objects.create(name="Boys Hostel 2", code="BH2", hostel_category="BOYS")
        b2 = Block.objects.create(hostel=hostel2, name="A", floor_count=3, gender_restriction="MALE")
        rm2 = Room.objects.create(block=b2, room_number="201", floor=1, room_type="DOUBLE", capacity=2)
        bed2 = Bed.objects.create(room=rm2, bed_number="A")

        warden2 = User.objects.create_user(
            email="bh2_warden@lpu.co.in",
            password="StrongPassword123!",
            role=User.Role.WARDEN,
            is_active=True,
        )
        WardenAssignment.objects.create(warden=warden2, hostel=hostel2, is_active=True)

        # Update student's request so preferred_hostel is hostel2 (BH2)
        self.req.preferred_hostel = hostel2
        self.req.save()

        # Destination warden of BH2 must be able to list and see this request
        self.client.force_authenticate(user=warden2)
        res = self.client.get("/api/v1/exchange-requests/")
        assert res.status_code == 200
        req_ids = [item["id"] for item in res.data.get("results", res.data)]
        assert self.req.id in req_ids

    def test_destination_warden_sees_incoming_transfer_record(self):
        from apps.hostels.models import Hostel, Block, Room, Bed
        from apps.accounts.models import WardenAssignment
        from apps.transfers.models import TransferRecord

        hostel2 = Hostel.objects.create(name="Boys Hostel 2", code="BH2", hostel_category="BOYS")
        b2 = Block.objects.create(hostel=hostel2, name="A", floor_count=3, gender_restriction="MALE")
        rm2 = Room.objects.create(block=b2, room_number="201", floor=1, room_type="DOUBLE", capacity=2)
        bed2 = Bed.objects.create(room=rm2, bed_number="A")

        warden2 = User.objects.create_user(
            email="bh2_warden_transfer@lpu.co.in",
            password="StrongPassword123!",
            role=User.Role.WARDEN,
            is_active=True,
        )
        WardenAssignment.objects.create(warden=warden2, hostel=hostel2, is_active=True)

        # Transfer from self.bed1_a (BH1) to bed2 (BH2)
        tr = TransferRecord.objects.create(
            student=self.student,
            old_bed=self.bed1_a,
            new_bed=bed2,
            approved_by=self.warden,
            status=TransferRecord.Status.COMPLETED,
        )

        # BH2 Warden must be able to see the incoming transfer record
        self.client.force_authenticate(user=warden2)
        res = self.client.get("/api/v1/transfers/")
        assert res.status_code == 200
        tr_ids = [item["id"] for item in res.data.get("results", res.data)]
        assert tr.id in tr_ids

    def test_transfer_letter_and_serializer_fields(self):
        from apps.transfers.models import TransferRecord
        from apps.transfers.serializers import TransferRecordSerializer
        from apps.transfers.views import _generate_transfer_letter_pdf

        tr = TransferRecord.objects.create(
            student=self.student,
            old_bed=self.bed1_a,
            new_bed=self.bed2_a,
            approved_by=self.warden,
            status=TransferRecord.Status.COMPLETED,
        )

        # 1. Serializer check for student_name and student_email
        serializer_data = TransferRecordSerializer(tr).data
        assert "student_name" in serializer_data
        assert "student_email" in serializer_data
        assert serializer_data["student_email"] == self.student.email
        assert serializer_data["student_name"] is not None

        # 2. PDF Download must return valid PDF file
        self.client.force_authenticate(user=self.warden)
        res = self.client.get(f"/api/v1/transfers/{tr.id}/letter/")
        assert res.status_code == 200
        assert res["Content-Type"] == "application/pdf"

        # 3. Defensive check: _generate_transfer_letter_pdf must not crash even if completed_at is None
        tr.completed_at = None
        pdf_buf = _generate_transfer_letter_pdf(tr)
        assert pdf_buf is not None
