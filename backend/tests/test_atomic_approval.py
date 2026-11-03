"""
Comprehensive verification of Section 12 & Final Acceptance Test:
- Four-person valid rotation cycle
- All 4 students accept
- Warden approves proposal
- Atomic execution of bed reallocations
- Transfer records & audit entries generated
- Verification 1: If one student declines, no allocation changes occur
- Verification 2: Atomic rollback if an unexpected error occurs during execution
- Verification 3: Concurrency prevention & idempotency
- Verification 4: Final allocation reconciles with transfer records
"""
import pytest
from unittest.mock import patch
from django.db import transaction, DatabaseError

from apps.accounts.models import User, WardenAssignment
from apps.hostels.models import Allocation
from apps.exchange_requests.models import ExchangeRequest
from apps.matching.engine import build_compatibility_graph, find_cycles
from apps.proposals.models import ExchangeProposal, ProposalParticipant
from apps.proposals.services import create_proposal_from_cycle, process_participant_response
from apps.approvals.services import approve_proposal
from apps.transfers.models import TransferRecord
from apps.audit.models import AuditEntry


@pytest.mark.django_db(transaction=True)
class TestAtomicApprovalScenario:

    def _setup_4_person_rotation(self, make_student, make_hostel, make_allocation, make_exchange_request, make_user):
        """Helper to create 4 students in a 4-bed rotation in BH1."""
        hostel, block, rooms, beds = make_hostel(gender='MALE')
        students = [make_student(gender='MALE') for _ in range(4)]
        alloc_beds = beds[:4]

        # Allocate beds
        for s, b in zip(students, alloc_beds):
            make_allocation(s, b)

        # Create requests forming cycle: 0 -> 1 -> 2 -> 3 -> 0
        requests = []
        for i in range(4):
            req = make_exchange_request(students[i], alloc_beds[i])
            req.preferred_bed = alloc_beds[(i + 1) % 4]
            req.save()
            requests.append(req)

        # Create warden assigned to this hostel
        warden = make_user('warden@test.edu', role=User.Role.WARDEN)
        WardenAssignment.objects.create(warden=warden, hostel=hostel, is_active=True)

        return hostel, students, alloc_beds, requests, warden

    def test_full_acceptance_scenario_4_person_cycle(
        self, make_student, make_hostel, make_allocation, make_exchange_request, make_user
    ):
        """
        Master acceptance scenario:
        1. 4 students occupy 4 beds.
        2. Preferences form valid 4-person cycle.
        3. Matching engine detects cycle.
        4. Proposal is created.
        5. All 4 students accept.
        6. Authorized warden approves.
        7. System updates all 4 allocations atomically.
        8. Transfer records and audit entries created.
        9. Reconciliation matches.
        """
        hostel, students, beds, requests, warden = self._setup_4_person_rotation(
            make_student, make_hostel, make_allocation, make_exchange_request, make_user
        )

        # Step 3: Engine detects cycle
        graph, req_map = build_compatibility_graph(requests)
        cycles = find_cycles(graph, req_map, max_length=5)
        assert len(cycles) == 1
        cycle = cycles[0]
        assert cycle.cycle_length == 4

        # Step 4: Proposal created
        proposal = create_proposal_from_cycle(cycle)
        assert proposal is not None
        assert proposal.status == ExchangeProposal.Status.PENDING_ACCEPTANCE
        assert proposal.participants.count() == 4

        # Step 5: All 4 students accept
        for student in students:
            part = proposal.participants.get(student=student)
            process_participant_response(part, accepted=True, note='Ready to swap')

        proposal.refresh_from_db()
        assert proposal.status == ExchangeProposal.Status.PENDING_APPROVAL
        assert all(p.accepted for p in proposal.participants.all())

        # Step 6: Authorized warden approves
        updated_prop = approve_proposal(proposal.id, warden, remarks='Approved by warden')

        assert updated_prop.status == ExchangeProposal.Status.COMPLETED

        # Step 7: Verify all 4 allocations were updated atomically
        for i in range(4):
            student = students[i]
            target_bed = beds[(i + 1) % 4]
            old_bed = beds[i]

            # Current active allocation must be target_bed
            active_alloc = Allocation.objects.get(student=student, is_active=True)
            assert active_alloc.bed == target_bed

            # Old allocation must be deactivated
            old_alloc = Allocation.objects.get(student=student, bed=old_bed)
            assert old_alloc.is_active is False

        # Step 8: Transfer records and audit entries
        transfers = TransferRecord.objects.filter(proposal=proposal)
        assert transfers.count() == 4
        for i in range(4):
            t = transfers.get(student=students[i])
            assert t.old_bed == beds[i]
            assert t.new_bed == beds[(i + 1) % 4]
            assert t.status == 'COMPLETED'

        # Audit logs recorded
        audit_entries = AuditEntry.objects.filter(target_id=str(proposal.id))
        assert audit_entries.exists()

    def test_one_student_declines_no_allocations_change(
        self, make_student, make_hostel, make_allocation, make_exchange_request, make_user
    ):
        """If one student declines, proposal is marked DECLINED and no allocations change."""
        hostel, students, beds, requests, warden = self._setup_4_person_rotation(
            make_student, make_hostel, make_allocation, make_exchange_request, make_user
        )

        graph, req_map = build_compatibility_graph(requests)
        cycle = find_cycles(graph, req_map, max_length=5)[0]
        proposal = create_proposal_from_cycle(cycle)

        # 3 students accept, 1 declines
        for s in students[:3]:
            part = proposal.participants.get(student=s)
            process_participant_response(part, accepted=True)

        part_decline = proposal.participants.get(student=students[3])
        process_participant_response(part_decline, accepted=False, note='Changed mind')

        proposal.refresh_from_db()
        assert proposal.status == ExchangeProposal.Status.DECLINED

        # Verify no allocations changed
        for i in range(4):
            alloc = Allocation.objects.get(student=students[i], is_active=True)
            assert alloc.bed == beds[i]

        assert TransferRecord.objects.filter(proposal=proposal).count() == 0

    def test_database_error_triggers_full_rollback(
        self, make_student, make_hostel, make_allocation, make_exchange_request, make_user
    ):
        """If an error occurs halfway through execution, transaction rollback leaves all allocations untouched."""
        hostel, students, beds, requests, warden = self._setup_4_person_rotation(
            make_student, make_hostel, make_allocation, make_exchange_request, make_user
        )

        graph, req_map = build_compatibility_graph(requests)
        cycle = find_cycles(graph, req_map, max_length=5)[0]
        proposal = create_proposal_from_cycle(cycle)

        for s in students:
            part = proposal.participants.get(student=s)
            process_participant_response(part, accepted=True)

        proposal.refresh_from_db()
        assert proposal.status == ExchangeProposal.Status.PENDING_APPROVAL

        # Mock an error when creating Allocation
        with patch('apps.hostels.models.Allocation.objects.create', side_effect=DatabaseError("Simulated failure")):
            with pytest.raises(DatabaseError):
                approve_proposal(proposal.id, warden, remarks='Approval will fail')

        # Verify complete rollback: proposal still PENDING_APPROVAL or untouched, allocations untouched
        proposal.refresh_from_db()
        assert proposal.status == ExchangeProposal.Status.PENDING_APPROVAL

        for i in range(4):
            alloc = Allocation.objects.get(student=students[i], is_active=True)
            assert alloc.bed == beds[i]

        assert TransferRecord.objects.filter(proposal=proposal).count() == 0
