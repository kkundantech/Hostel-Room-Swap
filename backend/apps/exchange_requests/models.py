"""
Module: backend/apps/exchange_requests/models.py

Work / Purpose:
    Defines the ExchangeRequest model capturing student preferences, target hostels/rooms, expiry timestamps, and request lifecycle statuses.

Connected Modules (Used By / Routes):
    - backend/apps/accounts/test_admin_modules.py
    - backend/apps/analytics/views.py
    - backend/apps/approvals/services.py
    - backend/apps/exchange_requests/admin.py
    - backend/apps/exchange_requests/serializers.py
    - backend/apps/exchange_requests/tasks.py
    - backend/apps/exchange_requests/views.py
    - backend/apps/hostels/management/commands/seed_demo_data.py
    - backend/apps/hostels/views.py
    - backend/apps/matching/engine.py
    - backend/apps/matching/management/commands/activate_full_pipeline.py
    - backend/apps/matching/views.py
    - backend/apps/policies/views.py
    - backend/apps/proposals/services.py
    - backend/tests/conftest.py
    - backend/tests/test_atomic_approval.py
    - backend/tests/test_auth_and_eligibility.py
    - backend/tests/test_concurrency_and_reconciliation.py
    - backend/tests/test_matching_engine.py
    - backend/tests/test_student_dashboard_features.py

Helpful / Supporting Modules (Dependencies):
    - django (external library / framework)

Original Module Notes:
    Exchange Request model.

    Represents a student's desire to exchange their hostel room.
    Lifecycle: OPEN → MATCHED → COMPLETED | WITHDRAWN | EXPIRED | CANCELLED

    Design notes:
    - A student can only have ONE active request (OPEN or MATCHED) at a time.
    - State transitions are managed through explicit service methods, not generic PATCH.
    - Preferences are stored as a JSON object for flexibility.
    - The request expires automatically via a Celery Beat task.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone


class ExchangeRequest(models.Model):
    """
    A student's request to exchange their current bed/room.
    """

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        MATCHED = 'MATCHED', 'Matched (In Proposal)'
        WITHDRAWN = 'WITHDRAWN', 'Withdrawn'
        EXPIRED = 'EXPIRED', 'Expired'
        CANCELLED = 'CANCELLED', 'Cancelled'
        COMPLETED = 'COMPLETED', 'Completed'

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='exchange_requests',
        limit_choices_to={'role': 'STUDENT'},
    )

    # The bed the student currently occupies (snapshot at request time)
    current_bed = models.ForeignKey(
        'hostels.Bed',
        on_delete=models.CASCADE,
        related_name='outgoing_requests',
        help_text='The bed the student currently occupies',
    )

    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )

    # What the student wants (flexible JSON preferences)
    preferred_hostel = models.ForeignKey(
        'hostels.Hostel',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incoming_preference_requests',
        help_text='Target hostel preference (optional)',
    )
    preferred_block = models.ForeignKey(
        'hostels.Block',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text='Target block preference (optional)',
    )
    preferred_room = models.ForeignKey(
        'hostels.Room',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text='Target room preference (optional)',
    )
    preferred_bed = models.ForeignKey(
        'hostels.Bed',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incoming_requests',
        help_text='Target specific bed (optional)',
    )

    reason = models.TextField(
        blank=True,
        help_text='Optional reason for requesting exchange',
    )

    # Eligibility validation result (cached, re-checked before execution)
    last_validation = models.JSONField(
        default=dict,
        blank=True,
        help_text='Cached result of last eligibility validation',
    )
    is_eligible = models.BooleanField(
        default=True,
        help_text='Cached eligibility flag (re-checked before matching)',
        db_index=True,
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text='Auto-computed expiry from REQUEST_VALIDITY_DAYS policy',
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'exchange_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student', 'status']),
            models.Index(fields=['status', 'is_eligible', 'expires_at']),
        ]
        constraints = [
            # A student can only have one OPEN or MATCHED request at a time
            models.UniqueConstraint(
                fields=['student'],
                condition=models.Q(status__in=['OPEN', 'MATCHED']),
                name='unique_active_request_per_student',
            ),
        ]

    def __str__(self):
        return f"Request#{self.id} by {self.student.email} [{self.status}]"

    @property
    def is_active(self):
        return self.status in (self.Status.OPEN, self.Status.MATCHED)

    def is_expired(self):
        """Check if this request has passed its expiry time."""
        if self.expires_at and timezone.now() > self.expires_at:
            return True
        return False
