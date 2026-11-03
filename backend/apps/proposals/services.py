"""Proposal creation and lifecycle services."""
import logging
from datetime import timedelta
from django.utils import timezone
from django.db import transaction

from .models import ExchangeProposal, ProposalParticipant
from apps.policies.services import get_policy_value, is_cross_hostel

logger = logging.getLogger(__name__)


def create_proposal_from_cycle(cycle) -> ExchangeProposal | None:
    """
    Create an ExchangeProposal from a MatchedCycle.

    Checks:
    - No existing active proposal covers the same set of participants.
    - All requests are still OPEN and eligible.

    Returns the created proposal or None if skipped.
    """
    from apps.exchange_requests.models import ExchangeRequest

    request_ids = [r.id for r in cycle.requests]

    # Check all requests are still OPEN
    valid_count = ExchangeRequest.objects.filter(
        id__in=request_ids,
        status=ExchangeRequest.Status.OPEN,
        is_eligible=True,
        expires_at__gt=timezone.now(),
    ).count()

    if valid_count != len(request_ids):
        logger.info(f"Skipping cycle {request_ids}: some requests no longer OPEN/eligible")
        return None

    # Check no existing proposal covers the same participants
    existing = ProposalParticipant.objects.filter(
        student_id__in=[r.student_id for r in cycle.requests],
        proposal__status__in=[
            ExchangeProposal.Status.PENDING_ACCEPTANCE,
            ExchangeProposal.Status.PENDING_APPROVAL,
            ExchangeProposal.Status.APPROVED,
        ],
    ).values_list('proposal_id', flat=True).distinct()

    if existing.exists():
        logger.info(f"Skipping cycle {request_ids}: participants already in active proposal")
        return None

    expiry_hours = get_policy_value('PROPOSAL_EXPIRY_HOURS', default=48)
    expires_at = timezone.now() + timedelta(hours=expiry_hours)

    with transaction.atomic():
        # Determine cross-hostel
        participants_info = [
            {'student': r.student, 'current_bed': r.current_bed,
             'proposed_bed': cycle.requests[(i + 1) % len(cycle.requests)].current_bed,
             'request': r}
            for i, r in enumerate(cycle.requests)
        ]

        hostel_ids = set()
        for p in participants_info:
            hostel_ids.add(p['current_bed'].hostel.id)
            hostel_ids.add(p['proposed_bed'].hostel.id)
        cross_hostel = len(hostel_ids) > 1

        proposal = ExchangeProposal.objects.create(
            status=ExchangeProposal.Status.PENDING_ACCEPTANCE,
            cycle_length=len(cycle.requests),
            is_cross_hostel=cross_hostel,
            expires_at=expires_at,
        )

        for p_info in participants_info:
            ProposalParticipant.objects.create(
                proposal=proposal,
                student=p_info['student'],
                exchange_request=p_info['request'],
                current_bed=p_info['current_bed'],
                proposed_bed=p_info['proposed_bed'],
            )

        # Mark all requests as MATCHED
        ExchangeRequest.objects.filter(id__in=request_ids).update(
            status=ExchangeRequest.Status.MATCHED
        )

        logger.info(f"Created proposal {proposal.reference_code} for cycle {request_ids}")

    # Send notifications (outside transaction is fine — notifications are informational)
    try:
        from apps.notifications.services import notify_proposal_created
        notify_proposal_created(proposal)
    except Exception as e:
        logger.warning(f"Failed to send proposal notifications: {e}")

    return proposal


def process_participant_response(participant: ProposalParticipant, accepted: bool, note: str = '') -> ExchangeProposal:
    """
    Record a participant's accept/decline response.

    Invariant: Partial acceptance NEVER modifies occupancy.

    If all participants accept → proposal moves to PENDING_APPROVAL.
    If any participant declines → proposal is DECLINED, requests reverted to OPEN.

    Returns the updated proposal.
    """
    proposal = participant.proposal

    # Guard: proposal must be awaiting acceptance
    if proposal.status != ExchangeProposal.Status.PENDING_ACCEPTANCE:
        raise ValueError(
            f"Proposal {proposal.reference_code} is not awaiting acceptance "
            f"(current status: {proposal.status})"
        )

    # Guard: expired proposals
    if timezone.now() > proposal.expires_at:
        _expire_proposal(proposal)
        raise ValueError(f"Proposal {proposal.reference_code} has expired.")

    # Guard: participant already responded
    if participant.accepted or participant.declined:
        raise ValueError(f"You have already responded to this proposal.")

    with transaction.atomic():
        now = timezone.now()
        participant.accepted = accepted
        participant.declined = not accepted
        participant.responded_at = now
        participant.response_note = note
        participant.save(update_fields=['accepted', 'declined', 'responded_at', 'response_note'])

        proposal.refresh_from_db()

        if not accepted:
            # One decline → cancel the whole proposal
            proposal.status = ExchangeProposal.Status.DECLINED
            proposal.save(update_fields=['status', 'updated_at'])

            # Revert matched requests to OPEN
            _revert_requests_to_open(proposal)

            logger.info(f"Proposal {proposal.reference_code} declined by {participant.student.email}")

        elif proposal.all_accepted():
            # Everyone accepted → move to warden approval queue
            proposal.status = ExchangeProposal.Status.PENDING_APPROVAL
            proposal.save(update_fields=['status', 'updated_at'])

            logger.info(f"Proposal {proposal.reference_code} fully accepted, awaiting approval")

            # Notify wardens
            try:
                from apps.notifications.services import notify_warden_approval_needed
                notify_warden_approval_needed(proposal)
            except Exception as e:
                logger.warning(f"Failed to notify wardens: {e}")

    # Post-commit notifications
    try:
        from apps.notifications.services import notify_participant_responded
        notify_participant_responded(proposal, participant, accepted)
    except Exception as e:
        logger.warning(f"Failed to send response notifications: {e}")

    proposal.refresh_from_db()
    return proposal


def _expire_proposal(proposal: ExchangeProposal):
    """Mark a proposal as expired and revert matched requests."""
    with transaction.atomic():
        if proposal.status in (
            ExchangeProposal.Status.PENDING_ACCEPTANCE,
            ExchangeProposal.Status.PENDING_APPROVAL,
        ):
            proposal.status = ExchangeProposal.Status.EXPIRED
            proposal.save(update_fields=['status', 'updated_at'])
            _revert_requests_to_open(proposal)


def _revert_requests_to_open(proposal: ExchangeProposal):
    """Revert all MATCHED exchange requests to OPEN after proposal cancel/decline/expire."""
    from apps.exchange_requests.models import ExchangeRequest
    request_ids = proposal.participants.values_list('exchange_request_id', flat=True)
    ExchangeRequest.objects.filter(
        id__in=request_ids,
        status=ExchangeRequest.Status.MATCHED,
    ).update(status=ExchangeRequest.Status.OPEN)
