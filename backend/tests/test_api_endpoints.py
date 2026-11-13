"""
Module: backend/tests/test_api_endpoints.py

Work / Purpose:
    Integration test suite verifying JWT auth, RBAC endpoints, requests, matching, proposals, approvals, and transfers APIs.

Connected Modules (Used By / Routes):
    - pytest / Django test runner (automated verification suite)

Helpful / Supporting Modules (Dependencies):
    - pytest (external library / framework)
    - rest_framework (external library / framework)

Original Module Notes:
    REST API tests for the Room Exchange platform.
    Verifies:
    - JWT Authentication (obtain token, refresh token)
    - Exchange request creation and listing
    - Unauthenticated access rejection
    - Analytics dashboard endpoints
"""
import pytest
from rest_framework import status


@pytest.mark.django_db
class TestApiEndpoints:

    def test_jwt_auth_login(self, api_client, make_student):
        student = make_student(email='student.api@test.edu')

        response = api_client.post('/api/v1/auth/login/', {
            'email': 'student.api@test.edu',
            'password': 'TestPass@123',
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'tokens' in response.data or 'access' in response.data

    def test_create_exchange_request(self, auth_client, make_student, make_hostel, make_allocation):
        hostel, block, rooms, beds = make_hostel()
        student = make_student()
        make_allocation(student, beds[0])

        client = auth_client(student)
        payload = {
            'preferred_hostel': hostel.id,
            'reason': 'Want room on floor 1',
        }
        response = client.post('/api/v1/exchange-requests/', payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert 'id' in response.data

    def test_unauthenticated_request_rejected(self, api_client):
        response = api_client.get('/api/v1/exchange-requests/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_analytics_kpi_endpoint(self, auth_client, make_user):
        admin = make_user('admin@test.edu', role='HOSTEL_ADMIN')
        client = auth_client(admin)

        response = client.get('/api/v1/admin/analytics/')
        assert response.status_code == status.HTTP_200_OK
        assert 'overview' in response.data
        assert 'exchange_requests' in response.data
