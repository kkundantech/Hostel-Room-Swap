"""
Audit trail model for tracking all important actions.

Records are append-only at the application level.
No update or delete operations are exposed through the API.
"""
from django.db import models
from django.conf import settings


class AuditEntry(models.Model):
    """
    Immutable audit record for tracking important actions.

    Every exchange request creation, edit, withdrawal, acceptance,
    decline, approval, rejection, expiry, and execution is logged here.
    """

    class Action(models.TextChoices):
        # Authentication
        LOGIN = 'LOGIN', 'Login'
        LOGOUT = 'LOGOUT', 'Logout'
        PASSWORD_CHANGE = 'PASSWORD_CHANGE', 'Password Change'

        # Exchange Requests
        REQUEST_CREATED = 'REQUEST_CREATED', 'Request Created'
        REQUEST_EDITED = 'REQUEST_EDITED', 'Request Edited'
        REQUEST_WITHDRAWN = 'REQUEST_WITHDRAWN', 'Request Withdrawn'
        REQUEST_EXPIRED = 'REQUEST_EXPIRED', 'Request Expired'
        REQUEST_MATCHED = 'REQUEST_MATCHED', 'Request Matched'
        REQUEST_COMPLETED = 'REQUEST_COMPLETED', 'Request Completed'

        # Proposals
        PROPOSAL_CREATED = 'PROPOSAL_CREATED', 'Proposal Created'
        PROPOSAL_ACCEPTED = 'PROPOSAL_ACCEPTED', 'Proposal Accepted by Participant'
        PROPOSAL_DECLINED = 'PROPOSAL_DECLINED', 'Proposal Declined by Participant'
        PROPOSAL_EXPIRED = 'PROPOSAL_EXPIRED', 'Proposal Expired'
        PROPOSAL_CANCELLED = 'PROPOSAL_CANCELLED', 'Proposal Cancelled'

        # Approvals
        PROPOSAL_APPROVED = 'PROPOSAL_APPROVED', 'Proposal Approved'
        PROPOSAL_REJECTED = 'PROPOSAL_REJECTED', 'Proposal Rejected'

        # Execution
        EXCHANGE_EXECUTED = 'EXCHANGE_EXECUTED', 'Exchange Executed'
        EXCHANGE_FAILED = 'EXCHANGE_FAILED', 'Exchange Execution Failed'
        EXCHANGE_ROLLED_BACK = 'EXCHANGE_ROLLED_BACK', 'Exchange Rolled Back'

        # Admin & Super Admin Authorization
        POLICY_CHANGED = 'POLICY_CHANGED', 'Policy Changed'
        ROLE_ASSIGNED = 'ROLE_ASSIGNED', 'Role Assigned'
        DATA_MODIFIED = 'DATA_MODIFIED', 'Data Modified'
        IDENTITY_AUTHORIZED = 'IDENTITY_AUTHORIZED', 'Identity Authorized'
        IDENTITY_UPDATED = 'IDENTITY_UPDATED', 'Identity Updated'
        INVITATION_RESENT = 'INVITATION_RESENT', 'Invitation Resent'
        ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED', 'Account Suspended'
        ACCOUNT_REACTIVATED = 'ACCOUNT_REACTIVATED', 'Account Reactivated'
        ACCOUNT_REVOKED = 'ACCOUNT_REVOKED', 'Account Revoked'
        OTP_REQUESTED = 'OTP_REQUESTED', 'OTP Challenge Requested'
        OTP_VERIFIED = 'OTP_VERIFIED', 'OTP Verified'
        ACCOUNT_ACTIVATED = 'ACCOUNT_ACTIVATED', 'Account Activated'
        PERMISSION_CHANGED = 'PERMISSION_CHANGED', 'Permissions Changed'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_entries',
    )
    action = models.CharField(
        max_length=30,
        choices=Action.choices,
        db_index=True,
    )
    description = models.TextField(
        help_text='Human-readable description of the action',
    )

    # Optional references to related objects
    target_type = models.CharField(
        max_length=50,
        blank=True,
        help_text='Model name of the affected object, e.g., ExchangeRequest',
    )
    target_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        help_text='Primary key of the affected object',
    )

    # Request metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)

    # Additional context
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional context data as JSON',
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_entries'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['target_type', 'target_id']),
            models.Index(fields=['user', 'created_at']),
        ]
        # Prevent updates and deletes at the model level
        # (enforced in views/services, not at DB level)

    def __str__(self):
        return f"[{self.action}] {self.description[:80]} ({self.created_at})"
