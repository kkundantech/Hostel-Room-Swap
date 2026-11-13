"""
Module: backend/apps/notifications/models.py

Work / Purpose:
    Defines the Notification model for persistent in-app alerts linked to users and swap events.

Connected Modules (Used By / Routes):
    - backend/apps/notifications/serializers.py
    - backend/apps/notifications/services.py
    - backend/apps/notifications/views.py
    - backend/tests/test_student_dashboard_features.py

Helpful / Supporting Modules (Dependencies):
    - django (external library / framework)

Original Module Notes:
    In-app and email notification models.
"""
from django.db import models
from django.conf import settings


class Notification(models.Model):
    """Database-backed in-app notification."""

    class NotifType(models.TextChoices):
        PROPOSAL_CREATED = 'PROPOSAL_CREATED', 'New Proposal Created'
        PROPOSAL_ACCEPTED = 'PROPOSAL_ACCEPTED', 'Proposal Accepted'
        PROPOSAL_DECLINED = 'PROPOSAL_DECLINED', 'Proposal Declined'
        PROPOSAL_EXPIRED = 'PROPOSAL_EXPIRED', 'Proposal Expired'
        PROPOSAL_APPROVED = 'PROPOSAL_APPROVED', 'Proposal Approved'
        PROPOSAL_REJECTED = 'PROPOSAL_REJECTED', 'Proposal Rejected'
        TRANSFER_COMPLETED = 'TRANSFER_COMPLETED', 'Transfer Completed'
        REQUEST_EXPIRED = 'REQUEST_EXPIRED', 'Request Expired'
        APPROVAL_NEEDED = 'APPROVAL_NEEDED', 'Approval Required'
        GENERAL = 'GENERAL', 'General Notification'

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    notif_type = models.CharField(
        max_length=30,
        choices=NotifType.choices,
        default=NotifType.GENERAL,
        db_index=True,
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    # Optional link to related object
    related_type = models.CharField(max_length=50, blank=True)
    related_id = models.PositiveBigIntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f"[{self.notif_type}] {self.title} -> {self.recipient.email}"
