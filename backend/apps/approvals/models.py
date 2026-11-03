"""Approval record model."""
from django.db import models
from django.conf import settings


class Approval(models.Model):
    """
    Approval or rejection record for an ExchangeProposal.

    For single-hostel exchanges: one warden approval is needed.
    For cross-hostel: chief warden approval is needed.
    Configurable via policy CROSS_HOSTEL_REQUIRES_CHIEF_WARDEN.
    """

    class Decision(models.TextChoices):
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    proposal = models.ForeignKey(
        'proposals.ExchangeProposal',
        on_delete=models.CASCADE,
        related_name='approvals',
    )
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='approval_decisions',
    )
    decision = models.CharField(
        max_length=10,
        choices=Decision.choices,
        db_index=True,
    )
    remarks = models.TextField(blank=True)
    decided_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'approvals'
        ordering = ['-decided_at']

    def __str__(self):
        return f"{self.decision} by {self.approver} for {self.proposal.reference_code}"
