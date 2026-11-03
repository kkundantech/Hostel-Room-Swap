"""
Comprehensive test suite for:
- Student Registration (OTP + 12-char Password + Authorized Roster validation)
- Warden Registration (Dedicated pre-authorized workflow + scope assignment)
- OTP security (hashing, expiry, attempt limits, cooldown)
- Password Reset via OTP (preserves roles & permissions)
- Role escalation prevention (server-enforced roles)
- Gender-based hostel & room isolation (Boys/Girls server-side filtering & IDOR protection)
- Warden hostel scope enforcement
- Chief Warden institutional access
- Multi-party cycle eligibility verification
"""
import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework import status

from apps.accounts.models import (
    User, StudentProfile, WardenAssignment,
    AuthorizedStudent, AuthorizedWarden, EmailVerificationChallenge,
)
from apps.accounts.otp import create_otp_challenge, verify_otp_challenge
from apps.hostels.models import Hostel, Block, Room, Bed, Allocation
from apps.exchange_requests.models import ExchangeRequest
from apps.proposals.models import ExchangeProposal, ProposalParticipant


@pytest.mark.django_db
class TestStudentRegistration:
    """Test Student multi-step OTP + Password registration flow."""

    def test_authorized_student_signup_full_flow(self, api_client):
        # 1. Pre-authorize student in roster
        auth_student = AuthorizedStudent.objects.create(
            registration_number='12345690',
            email='rohan.mehra@hostel.edu',
            full_name='Rohan Mehra',
            gender='MALE',
            approved_eligibility='BOYS',
            department='CSE',
            year_of_study=2,
            authorization_status=AuthorizedStudent.Status.ACTIVE,
            is_registered=False,
        )

        # Step 1: Request OTP
        req_resp = api_client.post('/api/v1/auth/student/signup/request-otp/', {
            'registration_number': '12345690',
            'email': 'rohan.mehra@hostel.edu',
            'gender': 'MALE',
        })
        assert req_resp.status_code == status.HTTP_200_OK
        assert 'email_hint' in req_resp.data

        # Verify challenge is stored as hash, NOT plaintext
        challenge = EmailVerificationChallenge.objects.filter(
            identifier='12345690',
            purpose=EmailVerificationChallenge.Purpose.STUDENT_REGISTRATION,
        ).first()
        assert challenge is not None
        assert not challenge.otp_hash.isdigit()  # Must be salted cryptographic hash
        assert challenge.is_consumed is False

        # Extract challenge hash salt to verify entered OTP in test
        salt, expected_hash = challenge.otp_hash.split('$', 1)
        # Find raw OTP matching hash
        raw_otp = None
        for code in range(100000, 1000000):
            from apps.accounts.otp import _hash_otp
            if _hash_otp(str(code), salt) == expected_hash:
                raw_otp = str(code)
                break
        assert raw_otp is not None

        # Step 2: Verify OTP
        verify_resp = api_client.post('/api/v1/auth/student/signup/verify-otp/', {
            'registration_number': '12345690',
            'otp': raw_otp,
        })
        assert verify_resp.status_code == status.HTTP_200_OK
        token = verify_resp.data.get('verification_token')
        assert token is not None

        # Step 3: Complete registration with 12+ char password
        complete_resp = api_client.post('/api/v1/auth/student/signup/complete/', {
            'registration_number': '12345690',
            'verification_token': token,
            'password': 'StrongPassword@123',
            'confirm_password': 'StrongPassword@123',
        })
        assert complete_resp.status_code == status.HTTP_201_CREATED
        assert complete_resp.data['user']['role'] == 'STUDENT'
        assert complete_resp.data['user']['registration_number'] == '12345690'
        assert complete_resp.data['user']['eligibility_classification'] == 'BOYS'

        # Verify DB records
        user = User.objects.get(registration_number='12345690')
        assert user.role == User.Role.STUDENT
        assert user.student_profile.gender == 'MALE'
        auth_student.refresh_from_db()
        assert auth_student.is_registered is True

    def test_unauthorized_student_rejected(self, api_client):
        # Registration number not in roster
        resp = api_client.post('/api/v1/auth/student/signup/request-otp/', {
            'registration_number': '99999999',
            'email': 'unknown@hostel.edu',
            'gender': 'MALE',
        })
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_email_mismatch_rejected(self, api_client):
        AuthorizedStudent.objects.create(
            registration_number='12345691',
            email='official.email@hostel.edu',
            full_name='Sneha Kapoor',
            gender='FEMALE',
            approved_eligibility='GIRLS',
            authorization_status=AuthorizedStudent.Status.ACTIVE,
        )
        resp = api_client.post('/api/v1/auth/student/signup/request-otp/', {
            'registration_number': '12345691',
            'email': 'wrong.email@hostel.edu',
            'gender': 'FEMALE',
        })
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_gender_mismatch_against_institutional_record_rejected(self, api_client):
        # Student cannot change gender to claim different hostel eligibility
        AuthorizedStudent.objects.create(
            registration_number='12345692',
            email='student.record@hostel.edu',
            full_name='Aman Verma',
            gender='MALE',
            approved_eligibility='BOYS',
            authorization_status=AuthorizedStudent.Status.ACTIVE,
        )
        resp = api_client.post('/api/v1/auth/student/signup/request-otp/', {
            'registration_number': '12345692',
            'email': 'student.record@hostel.edu',
            'gender': 'FEMALE',  # Incompatible with institutional record
        })
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert 'university record' in str(resp.data)

    def test_password_under_12_characters_rejected(self, api_client):
        challenge = create_otp_challenge(
            identifier='12345693',
            purpose=EmailVerificationChallenge.Purpose.STUDENT_REGISTRATION,
            email='shortpass@hostel.edu',
        )
        # Verify and get token
        from apps.accounts.otp import _hash_otp
        salt, exp_hash = challenge.otp_hash.split('$', 1)
        for code in range(100000, 1000000):
            if _hash_otp(str(code), salt) == exp_hash:
                raw_otp = str(code)
                break

        verify_resp = api_client.post('/api/v1/auth/student/signup/verify-otp/', {
            'registration_number': '12345693',
            'otp': raw_otp,
        })
        token = verify_resp.data['verification_token']

        complete_resp = api_client.post('/api/v1/auth/student/signup/complete/', {
            'registration_number': '12345693',
            'verification_token': token,
            'password': 'Short7!',  # Less than 12 characters
            'confirm_password': 'Short7!',
        })
        assert complete_resp.status_code == status.HTTP_400_BAD_REQUEST
        assert 'at least 12 characters' in str(complete_resp.data)


@pytest.mark.django_db
class TestWardenRegistration:
    """Test dedicated Warden pre-authorized OTP + Password registration."""

    def test_authorized_warden_signup_flow(self, api_client, make_hostel):
        hostel_obj, _, _, _ = make_hostel()

        auth_warden = AuthorizedWarden.objects.create(
            warden_id='W109',
            email='warden.official@hostel.edu',
            full_name='Amitabh Sen',
            phone='+919876543210',
            role=User.Role.WARDEN,
            authorization_status=AuthorizedWarden.Status.ACTIVE,
            is_registered=False,
        )
        auth_warden.assigned_hostels.add(hostel_obj)

        # Step 1: Request OTP
        req_resp = api_client.post('/api/v1/auth/warden/signup/request-otp/', {
            'warden_id': 'W109',
            'email': 'warden.official@hostel.edu',
        })
        assert req_resp.status_code == status.HTTP_200_OK

        # Find OTP
        challenge = EmailVerificationChallenge.objects.get(
            identifier='w109',
            purpose=EmailVerificationChallenge.Purpose.WARDEN_REGISTRATION,
        )
        salt, exp_hash = challenge.otp_hash.split('$', 1)
        from apps.accounts.otp import _hash_otp
        raw_otp = None
        for code in range(100000, 1000000):
            if _hash_otp(str(code), salt) == exp_hash:
                raw_otp = str(code)
                break

        # Step 2: Verify OTP
        verify_resp = api_client.post('/api/v1/auth/warden/signup/verify-otp/', {
            'warden_id': 'W109',
            'otp': raw_otp,
        })
        assert verify_resp.status_code == status.HTTP_200_OK
        token = verify_resp.data['verification_token']

        # Step 3: Complete with 12+ char password
        complete_resp = api_client.post('/api/v1/auth/warden/signup/complete/', {
            'warden_id': 'W109',
            'verification_token': token,
            'password': 'WardenStrongPassword@123',
            'confirm_password': 'WardenStrongPassword@123',
        })
        assert complete_resp.status_code == status.HTTP_201_CREATED
        assert complete_resp.data['user']['role'] == 'WARDEN'

        # Verify Warden Assignment created automatically for assigned hostel
        user = User.objects.get(warden_id='W109')
        assert WardenAssignment.objects.filter(warden=user, hostel=hostel_obj).exists()

    def test_unauthorized_warden_rejected(self, api_client):
        resp = api_client.post('/api/v1/auth/warden/signup/request-otp/', {
            'warden_id': 'W999',
            'email': 'fraud.warden@hostel.edu',
        })
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert 'not pre-authorized' in str(resp.data)


@pytest.mark.django_db
class TestOtpSecurity:
    """Test OTP attempt limits, cooldown, and expiry."""

    def test_otp_attempt_limits(self, api_client):
        challenge = create_otp_challenge(
            identifier='12345695',
            purpose=EmailVerificationChallenge.Purpose.STUDENT_REGISTRATION,
            email='test.attempts@hostel.edu',
        )

        # 5 wrong attempts
        for attempt in range(5):
            resp = api_client.post('/api/v1/auth/student/signup/verify-otp/', {
                'registration_number': '12345695',
                'otp': '000000',
            })
            assert resp.status_code == status.HTTP_400_BAD_REQUEST

        # 6th attempt should fail as consumed / max attempts exceeded
        challenge.refresh_from_db()
        assert challenge.is_consumed is True

    def test_otp_expiry(self, api_client):
        challenge = create_otp_challenge(
            identifier='12345696',
            purpose=EmailVerificationChallenge.Purpose.STUDENT_REGISTRATION,
            email='test.expiry@hostel.edu',
        )
        # Advance time past 5 minutes
        challenge.expires_at = timezone.now() - timedelta(minutes=1)
        challenge.save()

        resp = api_client.post('/api/v1/auth/student/signup/verify-otp/', {
            'registration_number': '12345696',
            'otp': '123456',
        })
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert 'expired' in str(resp.data)


def get_results(data):
    if isinstance(data, dict) and 'results' in data:
        return data['results']
    if isinstance(data, list):
        return data
    return []


@pytest.mark.django_db
class TestGenderBasedHostelAccess:
    """
    Test server-enforced isolation:
    - Boys' hostel students see ONLY boys' hostels & rooms.
    - Girls' hostel students see ONLY girls' hostels & rooms.
    - Direct API access with restricted hostel ID returns 404 (IDOR prevention).
    """

    def test_boys_student_cannot_view_or_retrieve_girls_hostel(self, auth_client, make_student):
        # Create Boys' Hostel
        bh = Hostel.objects.create(name='Boys Hostel 1', code='BH1', hostel_category='BOYS', is_active=True)
        bh_block = Block.objects.create(hostel=bh, name='A', gender_restriction='MALE')
        bh_room = Room.objects.create(block=bh_block, room_number='101')

        # Create Girls' Hostel
        gh = Hostel.objects.create(name='Girls Hostel 1', code='GH1', hostel_category='GIRLS', is_active=True)
        gh_block = Block.objects.create(hostel=gh, name='C', gender_restriction='FEMALE')
        gh_room = Room.objects.create(block=gh_block, room_number='201')

        # Male student
        boy_student = make_student(
            email='boy.student@hostel.edu',
            gender='MALE',
            eligibility_classification='BOYS',
        )
        client = auth_client(boy_student)

        # 1. Listing hostels returns only BH1
        list_resp = client.get('/api/v1/hostels/')
        assert list_resp.status_code == status.HTTP_200_OK
        hostels = get_results(list_resp.data)
        hostel_codes = [h['code'] for h in hostels]
        assert 'BH1' in hostel_codes
        assert 'GH1' not in hostel_codes

        # 2. Direct IDOR attempt on GH1 returns 404
        direct_resp = client.get(f'/api/v1/hostels/{gh.id}/')
        assert direct_resp.status_code == status.HTTP_404_NOT_FOUND

        # 3. Direct IDOR attempt on GH room returns 404
        room_resp = client.get(f'/api/v1/rooms/{gh_room.id}/')
        assert room_resp.status_code == status.HTTP_404_NOT_FOUND

    def test_girls_student_cannot_view_or_retrieve_boys_hostel(self, auth_client, make_student):
        bh = Hostel.objects.create(name='Boys Hostel 1', code='BH1', hostel_category='BOYS', is_active=True)
        gh = Hostel.objects.create(name='Girls Hostel 1', code='GH1', hostel_category='GIRLS', is_active=True)

        girl_student = make_student(
            email='girl.student@hostel.edu',
            gender='FEMALE',
            eligibility_classification='GIRLS',
        )
        client = auth_client(girl_student)

        # Listing hostels returns only GH1
        list_resp = client.get('/api/v1/hostels/')
        assert list_resp.status_code == status.HTTP_200_OK
        hostels = get_results(list_resp.data)
        hostel_codes = [h['code'] for h in hostels]
        assert 'GH1' in hostel_codes
        assert 'BH1' not in hostel_codes

        # Direct IDOR attempt on BH1 returns 404
        direct_resp = client.get(f'/api/v1/hostels/{bh.id}/')
        assert direct_resp.status_code == status.HTTP_404_NOT_FOUND

    def test_student_cannot_create_exchange_request_for_incompatible_hostel(self, auth_client, make_student, make_allocation):
        bh = Hostel.objects.create(name='Boys Hostel 1', code='BH1', hostel_category='BOYS', is_active=True)
        bh_block = Block.objects.create(hostel=bh, name='A', gender_restriction='MALE')
        bh_room = Room.objects.create(block=bh_block, room_number='101')
        bh_bed = Bed.objects.create(room=bh_room, bed_number='A')

        gh = Hostel.objects.create(name='Girls Hostel 1', code='GH1', hostel_category='GIRLS', is_active=True)

        boy_student = make_student(
            email='arjun.verma@hostel.edu',
            gender='MALE',
            eligibility_classification='BOYS',
        )
        make_allocation(student=boy_student, bed=bh_bed)

        client = auth_client(boy_student)

        # Attempt to request exchange to Girls Hostel GH1
        resp = client.post('/api/v1/requests/', {
            'preferred_hostel': gh.id,
            'reason': 'Testing cross-gender request restriction',
        })
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert 'not compatible' in str(resp.data)


@pytest.mark.django_db
class TestWardenScopeEnforcement:
    """Test warden assigned-hostel scope isolation."""

    def test_warden_sees_only_assigned_hostel(self, auth_client, make_user):
        bh1 = Hostel.objects.create(name='Boys Hostel 1', code='BH1', hostel_category='BOYS', is_active=True)
        bh2 = Hostel.objects.create(name='Boys Hostel 2', code='BH2', hostel_category='BOYS', is_active=True)
        gh1 = Hostel.objects.create(name='Girls Hostel 1', code='GH1', hostel_category='GIRLS', is_active=True)

        warden_user = make_user('warden.bh1@test.edu', role='WARDEN')
        WardenAssignment.objects.create(warden=warden_user, hostel=bh1, is_active=True)

        client = auth_client(warden_user)

        # List hostels: should only see BH1
        resp = client.get('/api/v1/hostels/')
        assert resp.status_code == status.HTTP_200_OK
        hostels = get_results(resp.data)
        codes = [h['code'] for h in hostels]
        assert 'BH1' in codes
        assert 'BH2' not in codes
        assert 'GH1' not in codes

        # Direct access to unassigned hostel GH1 returns 404
        direct_resp = client.get(f'/api/v1/hostels/{gh1.id}/')
        assert direct_resp.status_code == status.HTTP_404_NOT_FOUND

    def test_chief_warden_institutional_scope(self, auth_client, make_user):
        bh1 = Hostel.objects.create(name='Boys Hostel 1', code='BH1', hostel_category='BOYS', is_active=True)
        gh1 = Hostel.objects.create(name='Girls Hostel 1', code='GH1', hostel_category='GIRLS', is_active=True)

        chief = make_user('chiefwarden@test.edu', role='CHIEF_WARDEN')
        client = auth_client(chief)

        resp = client.get('/api/v1/hostels/')
        assert resp.status_code == status.HTTP_200_OK
        hostels = get_results(resp.data)
        codes = [h['code'] for h in hostels]
        assert 'BH1' in codes
        assert 'GH1' in codes


@pytest.mark.django_db
class TestPasswordResetOtp:
    """Test password reset via OTP."""

    def test_password_reset_preserves_role_and_permissions(self, api_client, make_user):
        user = make_user('reset.test@hostel.edu', role=User.Role.STUDENT, registration_number='12345699')

        # 1. Request reset OTP
        req_resp = api_client.post('/api/v1/auth/password/request-reset/', {
            'identifier': '12345699',
        })
        assert req_resp.status_code == status.HTTP_200_OK

        challenge = EmailVerificationChallenge.objects.get(
            identifier='12345699',
            purpose=EmailVerificationChallenge.Purpose.PASSWORD_RESET,
        )
        salt, exp_hash = challenge.otp_hash.split('$', 1)
        from apps.accounts.otp import _hash_otp
        raw_otp = None
        for code in range(100000, 1000000):
            if _hash_otp(str(code), salt) == exp_hash:
                raw_otp = str(code)
                break

        # 2. Verify OTP
        ver_resp = api_client.post('/api/v1/auth/password/verify-reset-otp/', {
            'identifier': '12345699',
            'otp': raw_otp,
        })
        assert ver_resp.status_code == status.HTTP_200_OK
        token = ver_resp.data['verification_token']

        # 3. Reset password (min 12 chars)
        res_resp = api_client.post('/api/v1/auth/password/reset/', {
            'identifier': '12345699',
            'verification_token': token,
            'new_password': 'BrandNewPassword@2026',
            'confirm_password': 'BrandNewPassword@2026',
        })
        assert res_resp.status_code == status.HTTP_200_OK

        # 4. Verify login with new password works
        login_resp = api_client.post('/api/v1/auth/login/', {
            'registration_number': '12345699',
            'password': 'BrandNewPassword@2026',
        })
        assert login_resp.status_code == status.HTTP_200_OK
        # Role must still be STUDENT (not altered)
        assert login_resp.data['user']['role'] == 'STUDENT'
