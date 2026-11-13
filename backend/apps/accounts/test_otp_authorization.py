"""
Module: backend/apps/accounts/test_otp_authorization.py

Work / Purpose:
    Automated test suite verifying centralized OTP authorization, pre-authorized identity verification, and activation security rules.

Connected Modules (Used By / Routes):
    - pytest / Django test runner (automated verification suite)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/authentication.py
    - backend/apps/accounts/models.py
    - backend/apps/accounts/otp.py
    - backend/apps/audit/models.py
    - django (external library / framework)
    - rest_framework (external library / framework)
"""

import re
from datetime import timedelta
from django.utils import timezone
from django.core import mail
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User, AuthorizedIdentity, OTPChallenge
from apps.accounts.otp import create_identity_otp_challenge, verify_identity_otp
from apps.accounts.authentication import get_tokens_for_user
from apps.audit.models import AuditEntry


class CentralizedOTPAuthorizationTests(APITestCase):
    def setUp(self):
        # Create Super Admin
        self.super_admin = User.objects.create_user(
            email="superadmin@hostel.edu",
            password="SuperPassword@123",
            first_name="Super",
            last_name="Admin",
            role=User.Role.SUPER_ADMIN,
            account_status=User.AccountStatus.ACTIVE,
            session_version=1,
        )
        refresh = get_tokens_for_user(self.super_admin)
        self.super_admin_token = str(refresh.access_token)

        # Create Normal Admin
        self.normal_admin = User.objects.create_user(
            email="admin@hostel.edu",
            password="AdminPassword@123",
            first_name="Hostel",
            last_name="Admin",
            role=User.Role.HOSTEL_ADMIN,
            account_status=User.AccountStatus.ACTIVE,
            session_version=1,
        )
        normal_refresh = get_tokens_for_user(self.normal_admin)
        self.normal_admin_token = str(normal_refresh.access_token)

    def test_super_admin_can_authorize_student(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.super_admin_token}")
        payload = {
            "registration_number": "STU1001",
            "full_name": "Rohan Sharma",
            "email": "rohan.sharma@hostel.edu",
            "phone_number": "9876543210",
            "gender": "MALE",
            "year_of_study": 2,
            "department": "CSE",
        }
        res = self.client.post("/api/v1/super-admin/identities/students/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(AuthorizedIdentity.objects.filter(institution_id="STU1001").exists())
        identity = AuthorizedIdentity.objects.get(institution_id="STU1001")
        self.assertEqual(identity.activation_status, AuthorizedIdentity.ActivationStatus.INVITED)
        self.assertEqual(identity.role, User.Role.STUDENT)

    def test_normal_admin_cannot_authorize_admin_or_access_super_admin_endpoints(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.normal_admin_token}")
        payload = {
            "staff_id": "ADM999",
            "full_name": "Rogue Admin",
            "email": "rogue@hostel.edu",
            "phone_number": "9876543211",
        }
        res = self.client.post("/api/v1/super-admin/identities/admins/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unknown_identifier_returns_generic_message(self):
        self.client.credentials()
        res = self.client.post(
            "/api/v1/accounts/activation/request-otp/",
            {"institution_id": "NONEXISTENT", "email": "nonexistent@hostel.edu"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("one-time password", res.data["detail"].lower())

    def test_full_activation_flow_with_otp_and_password(self):
        # 1. Authorize identity
        identity = AuthorizedIdentity.objects.create(
            institution_id="STU2002",
            trusted_email="priya.verma@hostel.edu",
            name="Priya Verma",
            role=User.Role.STUDENT,
            activation_status=AuthorizedIdentity.ActivationStatus.INVITED,
        )

        # 2. Request OTP via public activation endpoint
        self.client.credentials()
        req_res = self.client.post(
            "/api/v1/accounts/activation/request-otp/",
            {"institution_id": "STU2002", "email": "priya.verma@hostel.edu"},
            format="json",
        )
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)

        # 3. Extract 6-digit OTP from dispatched email
        self.assertTrue(len(mail.outbox) > 0)
        match = re.search(r'\b\d{6}\b', mail.outbox[-1].body)
        self.assertIsNotNone(match)
        otp_code = match.group(0)

        # 4. Verify OTP
        verify_res = self.client.post(
            "/api/v1/accounts/activation/verify-otp/",
            {"identifier": "STU2002", "otp": otp_code},
            format="json",
        )
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        self.assertIn("verification_token", verify_res.data)
        grant_token = verify_res.data["verification_token"]

        # 5. Set Password
        set_pw_res = self.client.post(
            "/api/v1/accounts/activation/set-password/",
            {
                "identifier": "STU2002",
                "verification_token": grant_token,
                "password": "SecurePassword@2026",
                "password_confirm": "SecurePassword@2026",
            },
            format="json",
        )
        self.assertEqual(set_pw_res.status_code, status.HTTP_200_OK)

        # 6. Check User account is created and ACTIVE
        user = User.objects.get(email="priya.verma@hostel.edu")
        self.assertEqual(user.account_status, User.AccountStatus.ACTIVE)
        self.assertTrue(user.check_password("SecurePassword@2026"))
        self.assertEqual(user.role, User.Role.STUDENT)

        # 7. Login succeeds with new credentials
        login_res = self.client.post(
            "/api/v1/accounts/login/",
            {"email": "priya.verma@hostel.edu", "password": "SecurePassword@2026"},
            format="json",
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_res.data)

    def test_incorrect_otp_decrements_attempts_and_locks(self):
        identity = AuthorizedIdentity.objects.create(
            institution_id="STU3003",
            trusted_email="arun.patel@hostel.edu",
            name="Arun Patel",
            role=User.Role.STUDENT,
            activation_status=AuthorizedIdentity.ActivationStatus.INVITED,
        )
        challenge = create_identity_otp_challenge(identity, purpose=OTPChallenge.Purpose.ACTIVATION)
        otp_code = challenge.raw_otp

        for attempt in range(challenge.max_attempts):
            res = self.client.post(
                "/api/v1/accounts/activation/verify-otp/",
                {"identifier": "STU3003", "otp": "000000"},
                format="json",
            )
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Next attempt should be rejected as exhausted/invalid
        res_exhausted = self.client.post(
            "/api/v1/accounts/activation/verify-otp/",
            {"identifier": "STU3003", "otp": otp_code},
            format="json",
        )
        self.assertEqual(res_exhausted.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(
            "exceeded" in res_exhausted.data["detail"].lower()
            or "no active" in res_exhausted.data["detail"].lower()
        )

    def test_expired_otp_is_rejected(self):
        identity = AuthorizedIdentity.objects.create(
            institution_id="STU4004",
            trusted_email="kavita.singh@hostel.edu",
            name="Kavita Singh",
            role=User.Role.STUDENT,
            activation_status=AuthorizedIdentity.ActivationStatus.INVITED,
        )
        challenge = create_identity_otp_challenge(identity, purpose=OTPChallenge.Purpose.ACTIVATION)
        otp_code = challenge.raw_otp
        challenge.expires_at = timezone.now() - timedelta(minutes=1)
        challenge.save()

        res = self.client.post(
            "/api/v1/accounts/activation/verify-otp/",
            {"identifier": "STU4004", "otp": otp_code},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", res.data["detail"].lower())

    def test_suspended_user_cannot_authenticate(self):
        user = User.objects.create_user(
            email="suspended@hostel.edu",
            password="Password@1234",
            first_name="Suspended",
            last_name="User",
            role=User.Role.STUDENT,
            account_status=User.AccountStatus.SUSPENDED,
            session_version=1,
        )
        refresh = get_tokens_for_user(user)
        access_token = str(refresh.access_token)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        res = self.client.get("/api/v1/accounts/me/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("account_suspended", str(res.data).lower())

    def test_session_version_mismatch_revokes_token(self):
        user = User.objects.create_user(
            email="active@hostel.edu",
            password="Password@1234",
            first_name="Active",
            last_name="User",
            role=User.Role.STUDENT,
            account_status=User.AccountStatus.ACTIVE,
            session_version=1,
        )
        refresh = get_tokens_for_user(user)
        access_token = str(refresh.access_token)

        # Access with valid token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        res1 = self.client.get("/api/v1/accounts/me/")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Invalidate session by incrementing session_version
        user.session_version += 1
        user.save()

        # Same token is now immediately invalid
        res2 = self.client.get("/api/v1/accounts/me/")
        self.assertEqual(res2.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("session_revoked", str(res2.data).lower())

    def test_super_admin_suspend_and_reactivate(self):
        user = User.objects.create_user(
            email="target@hostel.edu",
            password="Password@1234",
            first_name="Target",
            last_name="User",
            role=User.Role.STUDENT,
            account_status=User.AccountStatus.ACTIVE,
            session_version=1,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.super_admin_token}")

        # Suspend
        suspend_res = self.client.post(f"/api/v1/super-admin/users/{user.id}/suspend/", {"reason": "Policy violation"})
        self.assertEqual(suspend_res.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.account_status, User.AccountStatus.SUSPENDED)
        self.assertEqual(user.session_version, 2)

        # Reactivate
        reactivate_res = self.client.post(f"/api/v1/super-admin/users/{user.id}/reactivate/")
        self.assertEqual(reactivate_res.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.account_status, User.AccountStatus.ACTIVE)

    def test_super_admin_can_authorize_warden_and_activate(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.super_admin_token}")
        payload = {
            "staff_id": "WRD888",
            "full_name": "Dr. Rajesh Kumar",
            "email": "rajesh.warden@hostel.edu",
            "phone_number": "9123456780",
            "assigned_hostels": ["BH-1", "BH-2"],
        }
        res = self.client.post("/api/v1/super-admin/identities/wardens/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(AuthorizedIdentity.objects.filter(institution_id="WRD888").exists())

        # Public activation
        self.client.credentials()
        req_res = self.client.post(
            "/api/v1/accounts/activation/request-otp/",
            {"institution_id": "WRD888", "email": "rajesh.warden@hostel.edu"},
            format="json",
        )
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)
        match = re.search(r'\b\d{6}\b', mail.outbox[-1].body)
        otp = match.group(0)

        verify_res = self.client.post(
            "/api/v1/accounts/activation/verify-otp/",
            {"identifier": "WRD888", "otp": otp},
            format="json",
        )
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        token = verify_res.data["verification_token"]

        set_res = self.client.post(
            "/api/v1/accounts/activation/set-password/",
            {
                "identifier": "WRD888",
                "verification_token": token,
                "password": "WardenPassword@2026",
                "confirm_password": "WardenPassword@2026",
            },
            format="json",
        )
        self.assertEqual(set_res.status_code, status.HTTP_200_OK)

        warden_user = User.objects.get(email="rajesh.warden@hostel.edu")
        self.assertEqual(warden_user.role, User.Role.WARDEN)
        self.assertEqual(warden_user.account_status, User.AccountStatus.ACTIVE)

    def test_resend_cooldown_enforced(self):
        identity = AuthorizedIdentity.objects.create(
            institution_id="STU5555",
            trusted_email="cooldown@hostel.edu",
            name="Cooldown Test",
            role=User.Role.STUDENT,
            activation_status=AuthorizedIdentity.ActivationStatus.INVITED,
        )
        self.client.credentials()
        # First request
        res1 = self.client.post(
            "/api/v1/accounts/activation/request-otp/",
            {"institution_id": "STU5555", "email": "cooldown@hostel.edu"},
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Immediate second request triggers cooldown message
        res2 = self.client.post(
            "/api/v1/accounts/activation/request-otp/",
            {"institution_id": "STU5555", "email": "cooldown@hostel.edu"},
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("wait", res2.data["detail"].lower())

    def test_activation_grant_token_replay_rejected(self):
        identity = AuthorizedIdentity.objects.create(
            institution_id="STU6666",
            trusted_email="replay@hostel.edu",
            name="Replay Test",
            role=User.Role.STUDENT,
            activation_status=AuthorizedIdentity.ActivationStatus.INVITED,
        )
        challenge = create_identity_otp_challenge(identity, purpose=OTPChallenge.Purpose.ACTIVATION)
        otp = challenge.raw_otp

        self.client.credentials()
        verify_res = self.client.post(
            "/api/v1/accounts/activation/verify-otp/",
            {"identifier": "STU6666", "otp": otp},
            format="json",
        )
        token = verify_res.data["verification_token"]

        # First use
        set_res1 = self.client.post(
            "/api/v1/accounts/activation/set-password/",
            {
                "identifier": "STU6666",
                "verification_token": token,
                "password": "Password@2026!",
                "confirm_password": "Password@2026!",
            },
            format="json",
        )
        self.assertEqual(set_res1.status_code, status.HTTP_200_OK)

        # Second use (replay) must be rejected
        set_res2 = self.client.post(
            "/api/v1/accounts/activation/set-password/",
            {
                "identifier": "STU6666",
                "verification_token": token,
                "password": "Password@2026!",
                "confirm_password": "Password@2026!",
            },
            format="json",
        )
        self.assertEqual(set_res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_privileged_actions_create_audit_logs(self):
        initial_count = AuditEntry.objects.count()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.super_admin_token}")
        payload = {
            "registration_number": "STU7777",
            "full_name": "Audit Student",
            "email": "audit.student@hostel.edu",
            "phone_number": "9000000000",
            "gender": "MALE",
        }
        res = self.client.post("/api/v1/super-admin/identities/students/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        new_count = AuditEntry.objects.count()
        self.assertGreater(new_count, initial_count)
        self.assertTrue(AuditEntry.objects.filter(action="IDENTITY_AUTHORIZED").exists())

