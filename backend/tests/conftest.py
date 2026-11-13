"""
Module: backend/tests/conftest.py

Work / Purpose:
    Defines shared pytest fixtures and factories (users, students, hostels, rooms, beds, allocations, requests, API clients).

Connected Modules (Used By / Routes):
    - backend/conftest.py
    - pytest / Django test runner (automated verification suite)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/models.py
    - backend/apps/exchange_requests/models.py
    - backend/apps/hostels/models.py
    - django (external library / framework)
    - pytest (external library / framework)
    - rest_framework (external library / framework)
    - rest_framework_simplejwt (external library / framework)

Original Module Notes:
    Shared test fixtures and factories.
"""
import pytest
from django.utils import timezone
from datetime import timedelta


@pytest.fixture(autouse=True)
def disable_throttling(settings):
    """Disable DRF throttling during test suite execution."""
    rf = settings.REST_FRAMEWORK.copy()
    rf['DEFAULT_THROTTLE_CLASSES'] = []
    rf['DEFAULT_THROTTLE_RATES'] = {'anon': '100000/minute', 'user': '100000/minute'}
    settings.REST_FRAMEWORK = rf


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def make_user(db):
    def _make_user(email, role='STUDENT', **kwargs):
        from apps.accounts.models import User
        user = User.objects.create_user(
            email=email,
            password='TestPass@123',
            first_name=kwargs.pop('first_name', 'Test'),
            last_name=kwargs.pop('last_name', 'User'),
            role=role,
            **kwargs,
        )
        return user
    return _make_user


@pytest.fixture
def make_student(db, make_user):
    counter = [0]

    def _make_student(email=None, gender='MALE', fee_cleared=True, disciplinary_hold=False, **kwargs):
        from apps.accounts.models import StudentProfile
        counter[0] += 1
        email = email or f'student{counter[0]}@test.edu'
        user = make_user(email=email, role='STUDENT', **kwargs)
        StudentProfile.objects.create(
            user=user,
            roll_number=f'TEST{counter[0]:04d}',
            department='CS',
            year_of_study=2,
            gender=gender,
            fee_cleared=fee_cleared,
            disciplinary_hold=disciplinary_hold,
        )
        return user
    return _make_student


@pytest.fixture
def make_hostel(db):
    counter = [0]

    def _make_hostel(gender='MALE', **kwargs):
        from apps.hostels.models import Hostel, Block, Room, Bed
        counter[0] += 1
        hostel = Hostel.objects.create(
            name=f'Test Hostel {counter[0]}',
            code=f'TH{counter[0]}',
            **kwargs,
        )
        block = Block.objects.create(
            hostel=hostel, name='A',
            gender_restriction=gender,
            floor_count=2,
        )
        rooms = []
        for i in range(1, 6):
            room = Room.objects.create(
                block=block, room_number=f'10{i}',
                floor=1, room_type='DOUBLE', capacity=2,
            )
            rooms.append(room)
        beds = []
        for room in rooms:
            for letter in ['A', 'B']:
                bed = Bed.objects.create(
                    room=room, bed_number=letter,
                    is_active=True, is_available_for_exchange=True,
                )
                beds.append(bed)
        return hostel, block, rooms, beds
    return _make_hostel


@pytest.fixture
def make_allocation(db):
    def _make_allocation(student, bed, is_active=True, reason='Test allocation'):
        from apps.hostels.models import Allocation
        return Allocation.objects.create(
            student=student, bed=bed, is_active=is_active, reason=reason,
        )
    return _make_allocation


@pytest.fixture
def make_exchange_request(db):
    def _make_exchange_request(student, current_bed, preferred_hostel=None, days=14):
        from apps.exchange_requests.models import ExchangeRequest
        return ExchangeRequest.objects.create(
            student=student,
            current_bed=current_bed,
            status=ExchangeRequest.Status.OPEN,
            is_eligible=True,
            expires_at=timezone.now() + timedelta(days=days),
            preferred_hostel=preferred_hostel,
        )
    return _make_exchange_request


@pytest.fixture
def auth_client(api_client):
    def _auth_client(user):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        return api_client
    return _auth_client
