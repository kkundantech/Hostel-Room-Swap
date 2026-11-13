"""
Module: backend/apps/exchange_requests/tasks.py

Work / Purpose:
    Defines Celery periodic background tasks for expiring stale exchange requests/proposals and sending expiry reminder notifications.

Connected Modules (Used By / Routes):
    - backend/config/celery.py (Celery autodiscover_tasks & Beat schedule)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/audit/services.py
    - backend/apps/exchange_requests/models.py
    - backend/apps/notifications/services.py
    - backend/apps/proposals/models.py
    - backend/apps/proposals/services.py
    - celery (external library / framework)
    - django (external library / framework)

Original Module Notes:
    Celery background tasks for automatic expiry and notifications.

    All tasks are idempotent — safe to run multiple times.
    Critical endpoints also check timestamps synchronously.
    Correctness does not depend on the scheduler running at the exact second.
"""
import logging
from celery import shared_task
from django.utils import timezone
from django.db import transaction

logger = logging.getLogger(__name__)


@shared_task(name='expire_stale_requests', bind=True, max_retries=3)
def expire_stale_requests(self):
    """
    Mark OPEN exchange requests that have passed their expiry date as EXPIRED.
    Runs via Celery Beat on a schedule (e.g., every hour).
    """
    from apps.exchange_requests.models import ExchangeRequest
    from apps.audit.services import log_audit_event

    now = timezone.now()
    expired_qs = ExchangeRequest.objects.filter(
        status=ExchangeRequest.Status.OPEN,
        expires_at__lt=now,
    )
    count = expired_qs.update(status=ExchangeRequest.Status.EXPIRED)

    if count:
        logger.info(f"Expired {count} stale exchange requests")
        log_audit_event(
            action='REQUEST_EXPIRED',
            description=f'Celery task expired {count} stale exchange requests',
        )

    return {'expired_requests': count}


@shared_task(name='expire_stale_proposals', bind=True, max_retries=3)
def expire_stale_proposals(self):
    """
    Mark proposals past their acceptance deadline as EXPIRED.
    Reverts matched exchange requests back to OPEN.
    """
    from apps.proposals.models import ExchangeProposal
    from apps.proposals.services import _revert_requests_to_open, _expire_proposal
    from apps.audit.services import log_audit_event

    now = timezone.now()
    expired_proposals = ExchangeProposal.objects.filter(
        status__in=[
            ExchangeProposal.Status.PENDING_ACCEPTANCE,
            ExchangeProposal.Status.PENDING_APPROVAL,
        ],
        expires_at__lt=now,
    )

    count = 0
    for proposal in expired_proposals:
        try:
            with transaction.atomic():
                _expire_proposal(proposal)
                count += 1
                logger.info(f"Expired proposal {proposal.reference_code}")
        except Exception as e:
            logger.error(f"Failed to expire proposal {proposal.id}: {e}")

    if count:
        log_audit_event(
            action='PROPOSAL_EXPIRED',
            description=f'Celery task expired {count} proposals',
        )

    return {'expired_proposals': count}


@shared_task(name='send_expiry_reminders', bind=True)
def send_expiry_reminders(self):
    """
    Send reminder notifications for proposals expiring in the next 24 hours.
    """
    from apps.proposals.models import ExchangeProposal
    from apps.notifications.services import send_notification
    from datetime import timedelta

    now = timezone.now()
    soon = now + timedelta(hours=24)

    expiring_proposals = ExchangeProposal.objects.filter(
        status=ExchangeProposal.Status.PENDING_ACCEPTANCE,
        expires_at__gt=now,
        expires_at__lt=soon,
    ).prefetch_related('participants__student')

    count = 0
    for proposal in expiring_proposals:
        for participant in proposal.participants.filter(accepted=False, declined=False):
            send_notification(
                recipient=participant.student,
                notif_type='PROPOSAL_CREATED',
                title='Action Required: Proposal Expiring Soon',
                message=f'Proposal {proposal.reference_code} expires in less than 24 hours. '
                        f'Please accept or decline.',
                related_type='ExchangeProposal',
                related_id=proposal.id,
            )
            count += 1

    return {'reminders_sent': count}
