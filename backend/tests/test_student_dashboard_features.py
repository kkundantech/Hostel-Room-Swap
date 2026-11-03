"""
Unit and integration tests for all Student Dashboard backend features:
- Dynamic Notification count (0 when none, N when active, decrements on read)
- Dynamic Swap Proposal pending count (0 when none/responded, N when action required)
- Active Bed Allocation (/allocations/me/ and 404 when unallocated)
- Student Exchange Request lifecycle (create, check eligibility, withdraw, permissions)
- Room and Request Browsing (gender isolation and scoping)
- Transfer History isolation
"""
import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework import status

from apps.notifications.models import Notification
from apps.proposals.models import ExchangeProposal, ProposalParticipant
from apps.exchange_requests.models import ExchangeRequest
from apps.transfers.models import TransferRecord
from apps.hostels.models import Hostel, Block, Room, Bed, Allocation


@pytest.mark.django_db
class TestStudentNotifications:
    """Tests for student notifications and dynamic unread counter."""

    def test_unread_notifications_count_zero(self, auth_client, make_student):
        student = make_student()
        client = auth_client(student)

        response = client.get('/api/v1/notifications/unread-count/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['unread_count'] == 0

    def test_unread_notifications_count_with_notifications(self, auth_client, make_student):
        student = make_student()
        # Create 2 unread notifications for this student
        Notification.objects.create(
            recipient=student,
            title='Room Request Update',
            message='Your request has been matched.',
            notif_type='REQUEST_UPDATE',
            is_read=False,
        )
        Notification.objects.create(
            recipient=student,
            title='Proposal Ready',
            message='Please review proposal.',
            notif_type='PROPOSAL_READY',
            is_read=False,
        )

        client = auth_client(student)
        response = client.get('/api/v1/notifications/unread-count/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['unread_count'] == 2

    def test_mark_single_notification_read_decrements_count(self, auth_client, make_student):
        student = make_student()
        n1 = Notification.objects.create(
            recipient=student,
            title='Notice 1',
            message='Notice 1 body',
            is_read=False,
        )
        n2 = Notification.objects.create(
            recipient=student,
            title='Notice 2',
            message='Notice 2 body',
            is_read=False,
        )

        client = auth_client(student)

        # Verify initial count is 2
        res0 = client.get('/api/v1/notifications/unread-count/')
        assert res0.data['unread_count'] == 2

        # Mark first notification as read
        res1 = client.post(f'/api/v1/notifications/{n1.id}/read/')
        assert res1.status_code == status.HTTP_200_OK
        assert res1.data['is_read'] is True

        # Unread count must now be 1
        res2 = client.get('/api/v1/notifications/unread-count/')
        assert res2.data['unread_count'] == 1

    def test_mark_all_notifications_read_clears_count(self, auth_client, make_student):
        student = make_student()
        Notification.objects.create(recipient=student, title='A', message='msg', is_read=False)
        Notification.objects.create(recipient=student, title='B', message='msg', is_read=False)
        Notification.objects.create(recipient=student, title='C', message='msg', is_read=False)

        client = auth_client(student)

        # Mark all read
        res = client.post('/api/v1/notifications/read-all/')
        assert res.status_code == status.HTTP_200_OK
        assert res.data['marked_read'] == 3

        # Unread count must now be 0
        res_count = client.get('/api/v1/notifications/unread-count/')
        assert res_count.data['unread_count'] == 0

    def test_notifications_isolation_between_students(self, auth_client, make_student):
        student1 = make_student()
        student2 = make_student()

        Notification.objects.create(recipient=student1, title='For S1', message='msg', is_read=False)

        client2 = auth_client(student2)
        res = client2.get('/api/v1/notifications/unread-count/')
        assert res.data['unread_count'] == 0


@pytest.mark.django_db
class TestStudentSwapProposalPendingCount:
    """Tests for student proposal pending action counter and response workflow."""

    def test_pending_proposal_count_zero_when_no_proposals(self, auth_client, make_student):
        student = make_student()
        client = auth_client(student)

        response = client.get('/api/v1/proposals/pending-count/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['pending_count'] == 0

    def test_pending_proposal_count_active(self, auth_client, make_student, make_hostel, make_allocation):
        hostel, block, rooms, beds = make_hostel()
        student1 = make_student()
        student2 = make_student()

        make_allocation(student1, beds[0])
        make_allocation(student2, beds[1])

        proposal = ExchangeProposal.objects.create(
            cycle_length=2,
            is_cross_hostel=False,
            expires_at=timezone.now() + timedelta(days=3),
            status=ExchangeProposal.Status.PENDING_ACCEPTANCE,
        )
        ProposalParticipant.objects.create(
            proposal=proposal,
            student=student1,
            current_bed=beds[0],
            proposed_bed=beds[1],
            accepted=False,
            declined=False,
        )
        ProposalParticipant.objects.create(
            proposal=proposal,
            student=student2,
            current_bed=beds[1],
            proposed_bed=beds[0],
            accepted=False,
            declined=False,
        )

        client = auth_client(student1)
        response = client.get('/api/v1/proposals/pending-count/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['pending_count'] == 1

    def test_pending_proposal_count_drops_when_student_accepts(self, auth_client, make_student, make_hostel, make_allocation):
        hostel, block, rooms, beds = make_hostel()
        student1 = make_student()
        student2 = make_student()

        make_allocation(student1, beds[0])
        make_allocation(student2, beds[1])

        proposal = ExchangeProposal.objects.create(
            cycle_length=2,
            is_cross_hostel=False,
            expires_at=timezone.now() + timedelta(days=3),
            status=ExchangeProposal.Status.PENDING_ACCEPTANCE,
        )
        p1 = ProposalParticipant.objects.create(
            proposal=proposal,
            student=student1,
            current_bed=beds[0],
            proposed_bed=beds[1],
            accepted=False,
            declined=False,
        )
        p2 = ProposalParticipant.objects.create(
            proposal=proposal,
            student=student2,
            current_bed=beds[1],
            proposed_bed=beds[0],
            accepted=False,
            declined=False,
        )

        client1 = auth_client(student1)

        # Before response: pending_count == 1
        res0 = client1.get('/api/v1/proposals/pending-count/')
        assert res0.data['pending_count'] == 1

        # Student1 responds ACCEPT
        res_accept = client1.post(f'/api/v1/proposals/{proposal.id}/respond/', {
            'accepted': True,
            'note': 'Looks good to me',
        })
        assert res_accept.status_code == status.HTTP_200_OK

        # Student1's pending_count must now be 0!
        res1 = client1.get('/api/v1/proposals/pending-count/')
        assert res1.data['pending_count'] == 0

        # But Student2 has not responded yet: Student2's pending_count must still be 1
        client2 = auth_client(student2)
        res2 = client2.get('/api/v1/proposals/pending-count/')
        assert res2.data['pending_count'] == 1

    def test_pending_proposal_count_drops_when_student_declines(self, auth_client, make_student, make_hostel, make_allocation):
        hostel, block, rooms, beds = make_hostel()
        student1 = make_student()
        student2 = make_student()

        make_allocation(student1, beds[0])
        make_allocation(student2, beds[1])

        proposal = ExchangeProposal.objects.create(
            cycle_length=2,
            is_cross_hostel=False,
            expires_at=timezone.now() + timedelta(days=3),
            status=ExchangeProposal.Status.PENDING_ACCEPTANCE,
        )
        ProposalParticipant.objects.create(
            proposal=proposal,
            student=student1,
            current_bed=beds[0],
            proposed_bed=beds[1],
            accepted=False,
            declined=False,
        )
        ProposalParticipant.objects.create(
            proposal=proposal,
            student=student2,
            current_bed=beds[1],
            proposed_bed=beds[0],
            accepted=False,
            declined=False,
        )

        client1 = auth_client(student1)

        # Student1 declines
        res_dec = client1.post(f'/api/v1/proposals/{proposal.id}/respond/', {
            'accepted': False,
            'note': 'Prefer not to move now',
        })
        assert res_dec.status_code == status.HTTP_200_OK

        # Both student1 and student2 should now have pending_count == 0 because proposal is DECLINED
        res1 = client1.get('/api/v1/proposals/pending-count/')
        assert res1.data['pending_count'] == 0

        client2 = auth_client(student2)
        res2 = client2.get('/api/v1/proposals/pending-count/')
        assert res2.data['pending_count'] == 0

    def test_pending_proposal_count_ignores_expired_proposal(self, auth_client, make_student, make_hostel, make_allocation):
        hostel, block, rooms, beds = make_hostel()
        student = make_student()
        make_allocation(student, beds[0])

        proposal = ExchangeProposal.objects.create(
            cycle_length=2,
            is_cross_hostel=False,
            # Expired in past
            expires_at=timezone.now() - timedelta(hours=2),
            status=ExchangeProposal.Status.PENDING_ACCEPTANCE,
        )
        ProposalParticipant.objects.create(
            proposal=proposal,
            student=student,
            current_bed=beds[0],
            proposed_bed=beds[1],
            accepted=False,
            declined=False,
        )

        client = auth_client(student)
        response = client.get('/api/v1/proposals/pending-count/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['pending_count'] == 0


@pytest.mark.django_db
class TestStudentAllocations:
    """Tests for student active allocation endpoint (/allocations/me/)."""

    def test_get_my_allocation_success(self, auth_client, make_student, make_hostel, make_allocation):
        hostel, block, rooms, beds = make_hostel()
        student = make_student()
        allocation = make_allocation(student, beds[0])

        client = auth_client(student)
        response = client.get('/api/v1/allocations/me/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == allocation.id
        assert response.data['bed'] == beds[0].id
        assert response.data['bed_label'] == beds[0].full_label

    def test_get_my_allocation_unallocated_returns_404(self, auth_client, make_student):
        student = make_student()
        client = auth_client(student)

        response = client.get('/api/v1/allocations/me/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'No active allocation found' in response.data['detail']

    def test_allocation_me_is_isolated_to_authenticated_user(self, auth_client, make_student, make_hostel, make_allocation):
        hostel, block, rooms, beds = make_hostel()
        student1 = make_student()
        student2 = make_student()

        alloc1 = make_allocation(student1, beds[0])
        alloc2 = make_allocation(student2, beds[1])

        client2 = auth_client(student2)
        response = client2.get('/api/v1/allocations/me/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == alloc2.id
        assert response.data['id'] != alloc1.id


@pytest.mark.django_db
class TestStudentExchangeRequests:
    """Tests for exchange requests created, checked, and withdrawn by students."""

    def test_create_and_withdraw_exchange_request(self, auth_client, make_student, make_hostel, make_allocation):
        hostel, block, rooms, beds = make_hostel()
        student = make_student(fee_cleared=True, disciplinary_hold=False)
        make_allocation(student, beds[0])

        client = auth_client(student)

        # 1. Check eligibility preflight
        elig_res = client.get('/api/v1/exchange-requests/check-eligibility/')
        assert elig_res.status_code == status.HTTP_200_OK
        assert elig_res.data['is_eligible'] is True

        # 2. Create exchange request
        create_res = client.post('/api/v1/exchange-requests/', {
            'preferred_hostel': hostel.id,
            'reason': 'Looking for quiet study floor [Preference: 2 Seater, 3rd Floor]',
        })
        assert create_res.status_code == status.HTTP_201_CREATED
        req_id = create_res.data['id']
        assert ExchangeRequest.objects.get(id=req_id).status == ExchangeRequest.Status.OPEN

        # 3. Withdraw exchange request
        withdraw_res = client.post(f'/api/v1/exchange-requests/{req_id}/withdraw/')
        assert withdraw_res.status_code == status.HTTP_200_OK
        assert withdraw_res.data['status'] == ExchangeRequest.Status.WITHDRAWN

        # 4. Attempting to withdraw again returns 400
        withdraw_again = client.post(f'/api/v1/exchange-requests/{req_id}/withdraw/')
        assert withdraw_again.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_withdraw_another_students_request(self, auth_client, make_student, make_hostel, make_allocation, make_exchange_request):
        hostel, block, rooms, beds = make_hostel()
        student1 = make_student()
        student2 = make_student()

        make_allocation(student1, beds[0])
        make_allocation(student2, beds[1])

        req1 = make_exchange_request(student1, beds[0])

        client2 = auth_client(student2)
        # Student2 tries to withdraw Student1's request -> 404 (filtered out by queryset) or 403
        response = client2.post(f'/api/v1/exchange-requests/{req1.id}/withdraw/')
        assert response.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)


@pytest.mark.django_db
class TestStudentRoomAndHostelBrowsing:
    """Tests for student browsing of rooms and hostels respecting server-side isolation."""

    def test_student_available_rooms_respects_gender_isolation(self, auth_client, make_student, make_hostel):
        from apps.hostels.models import Hostel, Block, Room

        # Hostel with Male block
        hostel_m, block_m, rooms_m, _ = make_hostel(gender='MALE')

        # Female block in another hostel
        hostel_f = Hostel.objects.create(name='Female Hostel', code='FH1', hostel_category='GIRLS')
        block_f = Block.objects.create(hostel=hostel_f, name='G1', gender_restriction='FEMALE', floor_count=2)
        room_f = Room.objects.create(block=block_f, room_number='F101', floor=1, room_type='DOUBLE', capacity=2)

        male_student = make_student(gender='MALE')
        client = auth_client(male_student)

        res = client.get('/api/v1/rooms/')
        assert res.status_code == status.HTTP_200_OK
        room_ids = [r['id'] for r in res.data.get('results', res.data)]

        # Male student can see rooms from male block, but NOT female block
        assert rooms_m[0].id in room_ids
        assert room_f.id not in room_ids

    def test_hostels_list_accessible(self, auth_client, make_student, make_hostel):
        hostel, _, _, _ = make_hostel()
        student = make_student()
        client = auth_client(student)

        res = client.get('/api/v1/hostels/')
        assert res.status_code == status.HTTP_200_OK
        hostel_ids = [h['id'] for h in res.data.get('results', res.data)]
        assert hostel.id in hostel_ids


@pytest.mark.django_db
class TestStudentTransferHistory:
    """Tests for student transfer history scoped to own records."""

    def test_transfer_history_isolation(self, auth_client, make_student, make_hostel, make_allocation):
        hostel, block, rooms, beds = make_hostel()
        student1 = make_student()
        student2 = make_student()

        make_allocation(student1, beds[0])
        make_allocation(student2, beds[1])

        proposal = ExchangeProposal.objects.create(
            cycle_length=2,
            is_cross_hostel=False,
            expires_at=timezone.now() + timedelta(days=3),
            status=ExchangeProposal.Status.COMPLETED,
        )

        tr1 = TransferRecord.objects.create(
            proposal=proposal,
            student=student1,
            old_bed=beds[0],
            new_bed=beds[1],
            completed_at=timezone.now(),
            status=TransferRecord.Status.COMPLETED,
        )

        client1 = auth_client(student1)
        res1 = client1.get('/api/v1/transfers/')
        assert res1.status_code == status.HTTP_200_OK
        t_ids_1 = [t['id'] for t in res1.data.get('results', res1.data)]
        assert tr1.id in t_ids_1

        client2 = auth_client(student2)
        res2 = client2.get('/api/v1/transfers/')
        assert res2.status_code == status.HTTP_200_OK
        t_ids_2 = [t['id'] for t in res2.data.get('results', res2.data)]
        assert tr1.id not in t_ids_2
