"""
Module: backend/apps/notifications/services.py

Work / Purpose:
    Provides notification helper functions for proposal creation, student responses, warden approval alerts, and completed swaps.

Connected Modules (Used By / Routes):
    - backend/apps/approvals/services.py
    - backend/apps/exchange_requests/tasks.py
    - backend/apps/proposals/services.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/models.py
    - backend/apps/notifications/models.py
    - django (external library / framework)

Original Module Notes:
    Notification creation service.
"""
import logging
from django.utils import timezone
from django.db import transaction
from .models import Notification

logger = logging.getLogger(__name__)


def send_notification(recipient, notif_type, title, message, related_type='', related_id=None):
    """
    Create an in-app notification.
    Safe to call inside a transaction — the notification is written
    to the DB atomically with the triggering action.
    """
    try:
        return Notification.objects.create(
            recipient=recipient,
            notif_type=notif_type,
            title=title,
            message=message,
            related_type=related_type,
            related_id=related_id,
        )
    except Exception as e:
        logger.error(f"Failed to create notification for {recipient.email}: {e}")
        return None


def send_email_notification(recipient, subject, body):
    """
    Send an email notification.
    Must be called via transaction.on_commit() to avoid sending
    emails for rolled-back transactions.
    """
    from django.core.mail import send_mail
    from django.conf import settings
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient.email],
            fail_silently=True,
        )
        logger.info(f"Email sent to {recipient.email}: {subject}")
    except Exception as e:
        logger.error(f"Failed to send email to {recipient.email}: {e}")


def notify_proposal_created(proposal):
    """Notify all participants of a new proposal."""
    for participant in proposal.participants.select_related('student'):
        send_notification(
            recipient=participant.student,
            notif_type='PROPOSAL_CREATED',
            title='New Room Exchange Proposal',
            message=f'You have a new room exchange proposal (Ref: {proposal.reference_code}). '
                    f'Please review and respond by {proposal.expires_at.strftime("%Y-%m-%d %H:%M")}.',
            related_type='ExchangeProposal',
            related_id=proposal.id,
        )


def notify_participant_responded(proposal, participant, accepted):
    """Notify all other participants of a response."""
    action = 'accepted' if accepted else 'declined'
    for p in proposal.participants.select_related('student'):
        if p.student != participant.student:
            send_notification(
                recipient=p.student,
                notif_type='PROPOSAL_ACCEPTED' if accepted else 'PROPOSAL_DECLINED',
                title=f'Participant {action.capitalize()} Proposal',
                message=f'{participant.student.get_full_name()} has {action} '
                        f'proposal {proposal.reference_code}.',
                related_type='ExchangeProposal',
                related_id=proposal.id,
            )


def notify_warden_approval_needed(proposal):
    """Notify assigned wardens that a proposal needs approval."""
    from apps.accounts.models import WardenAssignment, User
    hostels = set()
    for p in proposal.participants.select_related('current_bed__room__block__hostel'):
        hostels.add(p.current_bed.hostel)

    for hostel in hostels:
        warden_ids = WardenAssignment.objects.filter(
            hostel=hostel, is_active=True
        ).values_list('warden_id', flat=True)
        wardens = User.objects.filter(id__in=warden_ids)
        for warden in wardens:
            send_notification(
                recipient=warden,
                notif_type='APPROVAL_NEEDED',
                title='Room Exchange Approval Required',
                message=f'Proposal {proposal.reference_code} requires your approval.',
                related_type='ExchangeProposal',
                related_id=proposal.id,
            )


def notify_proposal_approved(proposal):
    """Notify all participants the proposal was approved."""
    for p in proposal.participants.select_related('student'):
        send_notification(
            recipient=p.student,
            notif_type='PROPOSAL_APPROVED',
            title='Room Exchange Approved!',
            message=f'Your room exchange (Ref: {proposal.reference_code}) has been approved '
                    f'and will be executed shortly.',
            related_type='ExchangeProposal',
            related_id=proposal.id,
        )


def notify_proposal_rejected(proposal, reason=''):
    """Notify all participants the proposal was rejected."""
    for p in proposal.participants.select_related('student'):
        send_notification(
            recipient=p.student,
            notif_type='PROPOSAL_REJECTED',
            title='Room Exchange Rejected',
            message=f'Your room exchange (Ref: {proposal.reference_code}) was rejected. '
                    f'Reason: {reason or "No reason provided."}',
            related_type='ExchangeProposal',
            related_id=proposal.id,
        )


def notify_transfer_completed(transfer):
    """Notify the student their transfer is complete."""
    send_notification(
        recipient=transfer.student,
        notif_type='TRANSFER_COMPLETED',
        title='Room Transfer Completed',
        message=f'Your room transfer is complete. '
                f'New room: {transfer.new_bed.full_label}. '
                f'Transfer ID: {transfer.transfer_id}.',
        related_type='TransferRecord',
        related_id=transfer.id,
    )
