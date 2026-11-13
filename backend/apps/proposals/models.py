"""
Module: backend/apps/proposals/models.py

Work / Purpose:
    Defines ExchangeProposal and ProposalParticipant models representing matched multi-party swap cycles and individual student consent states.

Connected Modules (Used By / Routes):
    - backend/apps/accounts/test_admin_modules.py
    - backend/apps/analytics/views.py
    - backend/apps/approvals/services.py
    - backend/apps/approvals/views.py
    - backend/apps/exchange_requests/serializers.py
    - backend/apps/exchange_requests/tasks.py
    - backend/apps/hostels/management/commands/seed_demo_data.py
    - backend/apps/hostels/views.py
    - backend/apps/matching/management/commands/activate_full_pipeline.py
    - backend/apps/matching/views.py
    - backend/apps/policies/views.py
    - backend/apps/proposals/admin.py
    - backend/apps/proposals/serializers.py
    - backend/apps/proposals/services.py
    - backend/apps/proposals/views.py
    - backend/tests/test_atomic_approval.py
    - backend/tests/test_auth_and_eligibility.py
    - backend/tests/test_concurrency_and_reconciliation.py
    - backend/tests/test_student_dashboard_features.py

Helpful / Supporting Modules (Dependencies):
    - django (external library / framework)

Original Module Notes:
    ExchangeProposal and ProposalParticipant models.

    A proposal is created from a detected cycle. It contains all
    participants and their intended bed changes. Execution only
    occurs after ALL participants accept AND the appropriate
    warden(s) approve.

    INVARIANTS:
    - Partial acceptance NEVER changes occupancy.
    - A proposal can only execute once (idempotency enforced by DB + service).
    - Once completed or cancelled, a proposal is immutable.
"""
import uuid
from django.db import models
from django.conf import settings


def _generate_default_ref_code():
    from django.utils import timezone
    year = timezone.now().year
    uid = uuid.uuid4().hex[:6].upper()
    return f"EX-{year}-{uid}"


class ExchangeProposal(models.Model):
    """
    A multi-party exchange proposal generated from a matched cycle.

    Status lifecycle:
    PENDING_ACCEPTANCE → PENDING_APPROVAL → APPROVED → COMPLETED
                      ↘ DECLINED ↗ REJECTED ↗ EXPIRED

    All participants must accept before it moves to PENDING_APPROVAL.
    """

    class Status(models.TextChoices):
        PENDING_ACCEPTANCE = 'PENDING_ACCEPTANCE', 'Pending Participant Acceptance'
        PENDING_APPROVAL = 'PENDING_APPROVAL', 'Pending Warden Approval'
        APPROVED = 'APPROVED', 'Approved (Ready to Execute)'
        COMPLETED = 'COMPLETED', 'Completed'
        DECLINED = 'DECLINED', 'Declined by Participant'
        REJECTED = 'REJECTED', 'Rejected by Warden'
        EXPIRED = 'EXPIRED', 'Expired'
        CANCELLED = 'CANCELLED', 'Cancelled'

    reference_code = models.CharField(
        max_length=20,
        unique=True,
        default=_generate_default_ref_code,
        help_text='Human-readable reference code, e.g., EX-2024-001234',
    )

    status = models.CharField(
        max_length=25,
        choices=Status.choices,
        default=Status.PENDING_ACCEPTANCE,
        db_index=True,
    )

    cycle_length = models.PositiveSmallIntegerField(
        help_text='Number of participants in this rotation cycle',
    )

    is_cross_hostel = models.BooleanField(
        default=False,
        help_text='True if this involves beds from different hostels',
    )

    # Expiry
    expires_at = models.DateTimeField(
        db_index=True,
        help_text='All participants must accept before this timestamp',
    )

    # Approval
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_proposals',
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    # Execution
    executed_at = models.DateTimeField(null=True, blank=True)
    execution_lock = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        help_text='Used to prevent duplicate executions via database unique constraint',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'exchange_proposals'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'expires_at']),
        ]

    def __str__(self):
        return f"Proposal {self.reference_code} [{self.status}]"

    def save(self, *args, **kwargs):
        if not self.reference_code:
            self.reference_code = self._generate_reference_code()
        super().save(*args, **kwargs)

    def _generate_reference_code(self):
        from django.utils import timezone
        year = timezone.now().year
        # Use a short UUID fragment for uniqueness
        uid = uuid.uuid4().hex[:6].upper()
        return f"EX-{year}-{uid}"

    def all_accepted(self):
        """Return True if all participants have accepted."""
        return self.participants.filter(
            accepted=False, declined=False
        ).count() == 0 and self.participants.filter(accepted=True).count() == self.cycle_length

    def any_declined(self):
        """Return True if any participant has declined."""
        return self.participants.filter(declined=True).exists()


class ProposalParticipant(models.Model):
    """
    A single participant in a proposal.

    Records:
    - The student's current bed (source of truth at proposal creation time).
    - The proposed destination bed.
    - Whether the student has accepted or declined.
    """
    proposal = models.ForeignKey(
        ExchangeProposal,
        on_delete=models.CASCADE,
        related_name='participants',
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='proposal_participations',
        limit_choices_to={'role': 'STUDENT'},
    )
    exchange_request = models.ForeignKey(
        'exchange_requests.ExchangeRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='proposal_participations',
    )

    # Beds as of proposal creation (snapshot)
    current_bed = models.ForeignKey(
        'hostels.Bed',
        on_delete=models.CASCADE,
        related_name='outgoing_participants',
    )
    proposed_bed = models.ForeignKey(
        'hostels.Bed',
        on_delete=models.CASCADE,
        related_name='incoming_participants',
    )

    # Response
    accepted = models.BooleanField(default=False)
    declined = models.BooleanField(default=False)
    responded_at = models.DateTimeField(null=True, blank=True)
    response_note = models.CharField(max_length=300, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'proposal_participants'
        unique_together = ['proposal', 'student']
        ordering = ['created_at']

    def __str__(self):
        status = 'Accepted' if self.accepted else ('Declined' if self.declined else 'Pending')
        return f"{self.student.email} in {self.proposal.reference_code} [{status}]"
