"""
Module: backend/apps/approvals/services.py

Work / Purpose:
    Executes warden approval authority checks, rejection state rollback, and atomic multi-party bed-allocation swaps inside database transactions.

Connected Modules (Used By / Routes):
    - backend/apps/accounts/test_admin_modules.py
    - backend/apps/approvals/views.py
    - backend/apps/matching/management/commands/activate_full_pipeline.py
    - backend/tests/test_atomic_approval.py
    - backend/tests/test_concurrency_and_reconciliation.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/approvals/models.py
    - backend/apps/audit/services.py
    - backend/apps/exchange_requests/models.py
    - backend/apps/hostels/models.py
    - backend/apps/notifications/services.py
    - backend/apps/proposals/models.py
    - backend/apps/proposals/services.py
    - backend/apps/transfers/models.py
    - django (external library / framework)

Original Module Notes:
    Approval service: warden approval and atomic occupancy execution.

    CRITICAL CORRECTNESS SECTION.

    This module implements the transactionally safe exchange execution
    following the rules in Section 12 of the project spec.

    Locking strategy (documented):
    - All bed/allocation rows are locked in ascending primary-key order
      using SELECT FOR UPDATE to prevent deadlocks.
    - The proposal row itself is also locked before reading status,
      preventing concurrent double-execution.
    - Row-level PostgreSQL locks ensure only one execution can proceed
      for a given proposal.
    - Allocation changes, transfer records, and audit entries are
      committed in a single atomic transaction.
    - Emails are dispatched only after transaction.on_commit().

    Concurrency proof:
    - If two wardens approve the same proposal concurrently,
      the second will find proposal.status != PENDING_APPROVAL
      (already changed by the first) inside the locked transaction
      and will return an error without corrupting occupancy.
"""
import logging
from django.db import transaction, DatabaseError
from django.utils import timezone

from .models import Approval
from apps.proposals.models import ExchangeProposal, ProposalParticipant
from apps.hostels.models import Allocation
from apps.audit.services import log_audit_event

logger = logging.getLogger(__name__)


def _check_warden_authority(warden, proposal):
    """
    Verify the warden has authority over this proposal.

    Rules:
    - For same-hostel: warden must be assigned to that hostel.
    - For cross-hostel: must be CHIEF_WARDEN.
    - Hostel Admin can approve anything (configurable).
    """
    if warden.role == 'HOSTEL_ADMIN':
        return True  # Admin has universal authority

    if proposal.is_cross_hostel:
        if warden.role != 'CHIEF_WARDEN':
            return False
        return True
    else:
        # Warden must be assigned to all involved hostels
        if warden.role not in ('WARDEN', 'CHIEF_WARDEN'):
            return False
        assigned_hostel_ids = set(
            warden.warden_assignments.filter(is_active=True).values_list('hostel_id', flat=True)
        )
        involved_hostel_ids = set(
            proposal.participants.values_list(
                'current_bed__room__block__hostel_id', flat=True
            )
        )
        return involved_hostel_ids.issubset(assigned_hostel_ids)


def approve_proposal(proposal_id: int, warden, remarks: str = '') -> ExchangeProposal:
    """
    Approve a proposal and execute the occupancy exchange atomically.

    Steps (inside a single PostgreSQL transaction):
    1. Lock the proposal row (prevents concurrent double-approval).
    2. Re-check status, expiry, and authorization.
    3. Re-check all participant acceptances.
    4. Load and lock all affected Allocation rows in ascending PK order.
    5. Re-verify that each participant's current allocation matches the proposal snapshot.
    6. Deactivate old allocations.
    7. Create new allocations.
    8. Create TransferRecord for each participant.
    9. Mark ExchangeRequests as COMPLETED.
    10. Mark Proposal as COMPLETED.
    11. Write Approval and AuditEntry records.
    12. Commit.
    13. Send notifications post-commit.

    Returns the updated proposal.
    """
    with transaction.atomic():
        # Step 1: Lock proposal row
        try:
            proposal = ExchangeProposal.objects.select_for_update(nowait=True).get(
                id=proposal_id
            )
        except ExchangeProposal.DoesNotExist:
            raise ValueError("Proposal not found.")
        except DatabaseError:
            raise ValueError("Another approval is in progress. Please try again.")

        # Step 2a: Status check
        if proposal.status != ExchangeProposal.Status.PENDING_APPROVAL:
            raise ValueError(
                f"Proposal is not awaiting approval (status: {proposal.status}). "
                "It may have already been approved, rejected, or expired."
            )

        # Step 2b: Expiry check
        if timezone.now() > proposal.expires_at:
            proposal.status = ExchangeProposal.Status.EXPIRED
            proposal.save(update_fields=['status', 'updated_at'])
            raise ValueError("Proposal has expired.")

        # Step 2c: Authority check
        if not _check_warden_authority(warden, proposal):
            raise PermissionError(
                "You do not have authority to approve this proposal."
            )

        # Step 3: Re-verify all acceptances
        participants = list(proposal.participants.select_related(
            'student', 'current_bed__room__block__hostel',
            'proposed_bed__room__block__hostel',
            'exchange_request',
        ).all())

        for p in participants:
            if not p.accepted or p.declined:
                raise ValueError(
                    f"Participant {p.student.email} has not yet accepted."
                )

        # Step 4: Lock all allocations in ascending PK order to prevent deadlocks
        student_ids = [p.student_id for p in participants]
        current_allocations = list(
            Allocation.objects.select_for_update().filter(
                student_id__in=student_ids, is_active=True
            ).order_by('pk')  # Consistent ordering = no deadlocks
        )

        # Step 5: Verify current allocations match proposal snapshot
        alloc_by_student = {a.student_id: a for a in current_allocations}
        for p in participants:
            current_alloc = alloc_by_student.get(p.student_id)
            if not current_alloc:
                raise ValueError(
                    f"Student {p.student.email} no longer has an active allocation."
                )
            if current_alloc.bed_id != p.current_bed_id:
                raise ValueError(
                    f"Student {p.student.email}'s current allocation has changed "
                    f"since proposal creation. Cannot execute stale proposal."
                )

        now = timezone.now()

        # Steps 6-9: Atomic occupancy swap in two safe phases:
        # Phase 1: Deactivate ALL old allocations first so all beds in rotation are freed
        for p in participants:
            old_alloc = alloc_by_student[p.student_id]
            old_alloc.is_active = False
            old_alloc.deallocated_at = now
            old_alloc.save(update_fields=['is_active', 'deallocated_at', 'updated_at'])

        # Phase 2: Create new allocations and transfer records
        from apps.transfers.models import TransferRecord
        transfer_records = []

        for p in participants:
            old_alloc = alloc_by_student[p.student_id]
            new_alloc = Allocation.objects.create(
                student=p.student,
                bed=p.proposed_bed,
                is_active=True,
                reason=f'Exchange {proposal.reference_code}',
                source_proposal=proposal,
            )

            tr = TransferRecord(
                proposal=proposal,
                student=p.student,
                old_bed=p.current_bed,
                new_bed=p.proposed_bed,
                old_allocation=old_alloc,
                new_allocation=new_alloc,
                approved_by=warden,
                completed_at=now,
                status='COMPLETED',
            )
            transfer_records.append(tr)

        TransferRecord.objects.bulk_create(transfer_records)

        # Step 9: Mark exchange requests as COMPLETED
        from apps.exchange_requests.models import ExchangeRequest
        request_ids = [p.exchange_request_id for p in participants if p.exchange_request_id]
        ExchangeRequest.objects.filter(id__in=request_ids).update(
            status=ExchangeRequest.Status.COMPLETED,
            completed_at=now,
        )

        # Step 10: Mark proposal as COMPLETED
        proposal.status = ExchangeProposal.Status.COMPLETED
        proposal.approved_by = warden
        proposal.approved_at = now
        proposal.executed_at = now
        proposal.save(update_fields=['status', 'approved_by', 'approved_at', 'executed_at', 'updated_at'])

        # Step 11: Approval record + audit
        Approval.objects.create(
            proposal=proposal,
            approver=warden,
            decision=Approval.Decision.APPROVED,
            remarks=remarks,
        )

        log_audit_event(
            user=warden,
            action='EXCHANGE_EXECUTED',
            description=f'Proposal {proposal.reference_code} approved and executed by {warden.email}',
            target_type='ExchangeProposal',
            target_id=proposal.id,
            extra_data={'participants': [p.student.email for p in participants]},
        )

        # Step 12: Post-commit notifications (registered inside atomic block, dispatched on successful commit)
        def _send_post_commit_notifications():
            try:
                refreshed = ExchangeProposal.objects.prefetch_related(
                    'participants__student'
                ).get(id=proposal.id)
                from apps.notifications.services import notify_proposal_approved, notify_transfer_completed
                notify_proposal_approved(refreshed)
                for tr in TransferRecord.objects.filter(proposal=refreshed):
                    notify_transfer_completed(tr)
            except Exception as e:
                logger.error(f"Post-commit notification error: {e}")

        transaction.on_commit(_send_post_commit_notifications)

    return proposal


def reject_proposal(proposal_id: int, warden, remarks: str) -> ExchangeProposal:
    """
    Reject a proposal.

    Reverts all matched exchange requests to OPEN.
    """
    with transaction.atomic():
        try:
            proposal = ExchangeProposal.objects.select_for_update(nowait=True).get(
                id=proposal_id
            )
        except ExchangeProposal.DoesNotExist:
            raise ValueError("Proposal not found.")
        except DatabaseError:
            raise ValueError("Concurrent modification detected. Please try again.")

        if proposal.status != ExchangeProposal.Status.PENDING_APPROVAL:
            raise ValueError(
                f"Proposal is not awaiting approval (status: {proposal.status})."
            )

        if not _check_warden_authority(warden, proposal):
            raise PermissionError("You do not have authority to reject this proposal.")

        proposal.status = ExchangeProposal.Status.REJECTED
        proposal.rejection_reason = remarks
        proposal.save(update_fields=['status', 'rejection_reason', 'updated_at'])

        Approval.objects.create(
            proposal=proposal,
            approver=warden,
            decision=Approval.Decision.REJECTED,
            remarks=remarks,
        )

        # Revert matched requests to OPEN
        from apps.proposals.services import _revert_requests_to_open
        _revert_requests_to_open(proposal)

        log_audit_event(
            user=warden,
            action='PROPOSAL_REJECTED',
            description=f'Proposal {proposal.reference_code} rejected by {warden.email}. Reason: {remarks}',
            target_type='ExchangeProposal',
            target_id=proposal.id,
        )

        # Post-commit (registered inside atomic block)
        def _notify_rejection():
            try:
                from apps.notifications.services import notify_proposal_rejected
                refreshed = ExchangeProposal.objects.get(id=proposal.id)
                notify_proposal_rejected(refreshed, remarks)
            except Exception as e:
                logger.error(f"Post-commit rejection notification error: {e}")

        transaction.on_commit(_notify_rejection)

    return proposal
