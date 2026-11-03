"""
Transfer record model.

Created atomically alongside the allocation changes in the
approval execution service. Never created for failed transactions.
"""
import uuid
from django.db import models
from django.conf import settings


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

    completed_at = models.DateTimeField()
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
