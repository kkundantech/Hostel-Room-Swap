"""
Module: backend/apps/approvals/models.py

Work / Purpose:
    Defines the Approval model recording warden approve/reject decisions and notes on exchange proposals.

Connected Modules (Used By / Routes):
    - backend/apps/accounts/test_admin_modules.py
    - backend/apps/analytics/views.py
    - backend/apps/approvals/admin.py
    - backend/apps/approvals/services.py
    - backend/apps/approvals/views.py

Helpful / Supporting Modules (Dependencies):
    - django (external library / framework)

Original Module Notes:
    Approval record model.
"""
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
        approver_str = self.approver.email if self.approver else 'System'
        ref = self.proposal.reference_code if self.proposal else 'N/A'
        return f"{self.decision} by {approver_str} for {ref}"
