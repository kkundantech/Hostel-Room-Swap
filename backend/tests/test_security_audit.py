"""
Comprehensive Security and Access Control Verification Tests.
Verifies defense-in-depth across authentication, authorization, IDOR, gender segregation,
destructive actions, and audit trail isolation.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from django.core import mail

from apps.accounts.models import User, AuthorizedIdentity, StudentProfile, WardenAssignment
from apps.hostels.models import Hostel, Block, Room, Bed, Allocation
from apps.exchange_requests.models import ExchangeRequest
from apps.audit.models import AuditEntry


@pytest.mark.django_db
class TestSecurityHardening:
    def setup_method(self):
        self.client = APIClient()

        # 1. Hostels & Blocks
        self.hostel_boys = Hostel.objects.create(name="Boys Hostel 1", code="BH1", hostel_category="BOYS")
        self.block_male = Block.objects.create(hostel=self.hostel_boys, name="A", gender_restriction="MALE")
        self.room_male = Room.objects.create(block=self.block_male, room_number="101", capacity=2)
        self.bed_m1 = Bed.objects.create(room=self.room_male, bed_number="A")
        self.bed_m2 = Bed.objects.create(room=self.room_male, bed_number="B")

        self.hostel_girls = Hostel.objects.create(name="Girls Hostel 1", code="GH1", hostel_category="GIRLS")
        self.block_female = Block.objects.create(hostel=self.hostel_girls, name="G1", gender_restriction="FEMALE")
        self.room_female = Room.objects.create(block=self.block_female, room_number="201", capacity=2)
        self.bed_f1 = Bed.objects.create(room=self.room_female, bed_number="A")

        # 2. Users
        self.super_admin = User.objects.create_user(
            email="superadmin@hostel.edu",
            password="SuperPassword123!",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )

        self.admin = User.objects.create_user(
            email="admin@hostel.edu",
            password="AdminPassword123!",
            role=User.Role.HOSTEL_ADMIN,
            is_staff=True,
        )

        self.warden = User.objects.create_user(
            email="warden@hostel.edu",
            password="WardenPassword123!",
            role=User.Role.WARDEN,
        )
        WardenAssignment.objects.create(warden=self.warden, hostel=self.hostel_boys, is_active=True)

        self.student_a = User.objects.create_user(
            email="student.a@hostel.edu",
            password="StudentPassword123!",
            role=User.Role.STUDENT,
            registration_number="12000001",
        )
        StudentProfile.objects.create(
            user=self.student_a,
            roll_number="12000001",
            gender="MALE",
            year_of_study=2,
            department="CSE",
        )
        self.alloc_a = Allocation.objects.create(
            student=self.student_a,
            bed=self.bed_m1,
            is_active=True,
            reason="Initial Allocation",
        )

        self.student_b = User.objects.create_user(
            email="student.b@hostel.edu",
            password="StudentPassword123!",
            role=User.Role.STUDENT,
            registration_number="12000002",
        )
        StudentProfile.objects.create(
            user=self.student_b,
            roll_number="12000002",
            gender="MALE",
            year_of_study=2,
            department="ECE",
        )

    def test_activation_otp_rejects_untrusted_email_takeover(self):
        """Attacker cannot hijack pre-authorized identity by providing an untrusted email."""
        identity = AuthorizedIdentity.objects.create(
            institution_id="STU9999",
            trusted_email="victim.student@hostel.edu",
            name="Victim Student",
            role=User.Role.STUDENT,
            activation_status=AuthorizedIdentity.ActivationStatus.INVITED,
        )

        # Attacker tries to trigger OTP to attacker@evil.com using victim's institution_id
        res = self.client.post(
            "/api/v1/accounts/activation/request-otp/",
            {"institution_id": "STU9999", "email": "attacker@evil.com"},
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK

        # Verify identity's trusted_email was NOT overwritten
        identity.refresh_from_db()
        assert identity.trusted_email == "victim.student@hostel.edu"

        # Verify mail was NOT sent to attacker
        for msg in mail.outbox:
            assert "attacker@evil.com" not in msg.to

    def test_reset_inventory_requires_super_admin_and_confirmation(self):
        """Only Super Admin with explicit confirmation code can reset room inventory."""
        # 1. Normal Admin attempt -> 403 Forbidden
        self.client.force_authenticate(user=self.admin)
        res = self.client.post("/api/v1/rooms/reset_inventory/", {"confirm": "WIPE_ALL_ROOM_INVENTORY"})
        assert res.status_code == status.HTTP_403_FORBIDDEN

        # 2. Super Admin without confirmation -> 400 Bad Request
        self.client.force_authenticate(user=self.super_admin)
        res = self.client.post("/api/v1/rooms/reset_inventory/", {})
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "confirm" in res.data["detail"].lower()

        # 3. Super Admin with confirmation -> 200 OK and audit logged
        res = self.client.post("/api/v1/rooms/reset_inventory/", {"confirm": "WIPE_ALL_ROOM_INVENTORY"})
        assert res.status_code == status.HTTP_200_OK
        assert Room.objects.count() == 0

        # Audit entry exists
        audit = AuditEntry.objects.filter(action="INVENTORY_RESET").first()
        assert audit is not None
        assert audit.user == self.super_admin

    def test_direct_room_allocation_enforces_gender_policy(self):
        """Warden cannot allocate male student to female block/hostel."""
        # Create request for student_a (MALE)
        req = ExchangeRequest.objects.create(
            student=self.student_a,
            current_bed=self.bed_m1,
            preferred_hostel=self.hostel_boys,
            status=ExchangeRequest.Status.OPEN,
            is_eligible=True,
            expires_at=timezone.now() + timezone.timedelta(days=14),
        )

        # Authenticate as super admin (who has universal hostel scope)
        self.client.force_authenticate(user=self.super_admin)

        # Attempt to allocate to female bed
        res = self.client.post(
            f"/api/v1/exchange-requests/{req.id}/approve/",
            {"target_bed_id": self.bed_f1.id, "remarks": "Invalid allocation"},
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "policy violation" in res.data["detail"].lower()

    def test_audit_log_isolation_for_warden(self):
        """Wardens can only see their own audit logs, not campus-wide logs."""
        AuditEntry.objects.create(user=self.warden, action="WARDEN_ACTION", description="Warden did action")
        AuditEntry.objects.create(user=self.super_admin, action="ADMIN_SECRET", description="Root action")

        # Warden view
        self.client.force_authenticate(user=self.warden)
        res = self.client.get("/api/v1/admin/audit-logs/")
        assert res.status_code == status.HTTP_200_OK
        results = res.data.get("results", res.data)
        actions = [a["action"] for a in results]
        assert "WARDEN_ACTION" in actions
        assert "ADMIN_SECRET" not in actions

        # Admin view
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/v1/admin/audit-logs/")
        assert res.status_code == status.HTTP_200_OK
        results = res.data.get("results", res.data)
        actions = [a["action"] for a in results]
        assert "WARDEN_ACTION" in actions
        assert "ADMIN_SECRET" in actions

    def test_idor_protection_student_cannot_tamper_other_requests(self):
        """Student A cannot view or withdraw Student B's exchange request."""
        req_b = ExchangeRequest.objects.create(
            student=self.student_b,
            current_bed=self.bed_m2,
            preferred_hostel=self.hostel_boys,
            status=ExchangeRequest.Status.OPEN,
            is_eligible=True,
            expires_at=timezone.now() + timezone.timedelta(days=14),
        )

        self.client.force_authenticate(user=self.student_a)

        # Student A cannot retrieve Student B's request (404 due to queryset scoping)
        res = self.client.get(f"/api/v1/exchange-requests/{req_b.id}/")
        assert res.status_code == status.HTTP_404_NOT_FOUND

        # Student A cannot withdraw Student B's request
        res = self.client.post(f"/api/v1/exchange-requests/{req_b.id}/withdraw/")
        assert res.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)
