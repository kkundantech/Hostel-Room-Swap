"""
Module: backend/apps/transfers/models.py

Work / Purpose:
    Defines the TransferRecord model logging completed atomic bed-to-bed student transfers with cycle references.

Connected Modules (Used By / Routes):
    - backend/apps/analytics/views.py
    - backend/apps/approvals/services.py
    - backend/apps/hostels/management/commands/seed_demo_data.py
    - backend/apps/matching/management/commands/activate_full_pipeline.py
    - backend/apps/policies/services.py
    - backend/apps/transfers/admin.py
    - backend/apps/transfers/serializers.py
    - backend/apps/transfers/views.py
    - backend/tests/test_atomic_approval.py
    - backend/tests/test_concurrency_and_reconciliation.py
    - backend/tests/test_student_dashboard_features.py

Helpful / Supporting Modules (Dependencies):
    - django (external library / framework)

Original Module Notes:
    Transfer record model.
    Created atomically alongside the allocation changes in the
    approval execution service. Never created for failed transactions.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class TransferRecord(models.Model):
    """
    Permanent, immutable record of a completed room transfer.

    Every successful exchange creates exactly one TransferRecord per
    participant. Transfer records are traceable back to their proposal
    and approval through foreign keys.
    """

    class Status(models.TextChoices):
        COMPLETED = 'COMPLETED', 'Completed'
        REVERSED = 'REVERSED', 'Reversed (Admin)'

    transfer_id = models.CharField(
        max_length=36,
        unique=True,
        default=uuid.uuid4,
        help_text='Globally unique transfer reference',
    )

    proposal = models.ForeignKey(
        'proposals.ExchangeProposal',
        on_delete=models.SET_NULL,
        null=True,
        related_name='transfer_records',
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='transfer_records',
    )

    # Bed references (before and after)
    old_bed = models.ForeignKey(
        'hostels.Bed',
        on_delete=models.SET_NULL,
        null=True,
        related_name='outgoing_transfers',
    )
    new_bed = models.ForeignKey(
        'hostels.Bed',
        on_delete=models.SET_NULL,
        null=True,
        related_name='incoming_transfers',
    )

    # Allocation references for full traceability
    old_allocation = models.ForeignKey(
        'hostels.Allocation',
        on_delete=models.SET_NULL,
        null=True,
        related_name='outgoing_transfer',
    )
    new_allocation = models.ForeignKey(
        'hostels.Allocation',
        on_delete=models.SET_NULL,
        null=True,
        related_name='incoming_transfer',
    )

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='authorized_transfers',
    )

    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.COMPLETED,
    )

    completed_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'transfer_records'
        ordering = ['-completed_at']
        indexes = [
            models.Index(fields=['student', 'completed_at']),
            models.Index(fields=['proposal']),
        ]

    def __str__(self):
        return f"Transfer {self.transfer_id} | {self.student.email}"
