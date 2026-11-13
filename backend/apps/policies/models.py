"""
Module: backend/apps/policies/models.py

Work / Purpose:
    Defines the PolicyRule model storing configurable institutional swap rules (cycle length, semester lock, fee/disciplinary gates, expiry days).

Connected Modules (Used By / Routes):
    - backend/apps/accounts/test_admin_modules.py
    - backend/apps/hostels/management/commands/seed_demo_data.py
    - backend/apps/policies/admin.py
    - backend/apps/policies/serializers.py
    - backend/apps/policies/services.py
    - backend/apps/policies/views.py
    - backend/tests/test_policies.py

Helpful / Supporting Modules (Dependencies):
    - django (external library / framework)

Original Module Notes:
    Policy rules model.

    Configurable policy settings that can be changed without code deployment.
    Each policy has a unique key, value, description, and optional scope
    (hostel-specific or global).
"""
from django.db import models


class PolicyRule(models.Model):
    """
    Configurable policy rule for the exchange system.

    Examples:
    - COOLING_OFF_DAYS: 30 (days after transfer before next exchange)
    - REQUEST_VALIDITY_DAYS: 14 (days a request stays open)
    - PROPOSAL_EXPIRY_HOURS: 48 (hours for participants to accept)
    - MAX_CYCLE_LENGTH: 5 (maximum number of students in a rotation)
    - REQUIRE_FEE_CLEARANCE: true
    - REQUIRE_WARDEN_REMARKS: true
    - CROSS_HOSTEL_REQUIRES_CHIEF_WARDEN: true
    """
    key = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text='Unique policy identifier, e.g., COOLING_OFF_DAYS',
    )
    value = models.CharField(
        max_length=500,
        help_text='Policy value (interpreted based on value_type)',
    )

    class ValueType(models.TextChoices):
        INTEGER = 'INTEGER', 'Integer'
        BOOLEAN = 'BOOLEAN', 'Boolean'
        STRING = 'STRING', 'String'
        JSON = 'JSON', 'JSON'

    value_type = models.CharField(
        max_length=10,
        choices=ValueType.choices,
        default=ValueType.INTEGER,
    )

    description = models.TextField(
        blank=True,
        help_text='Human-readable description of this policy',
    )
    is_active = models.BooleanField(default=True)

    # Optional hostel-specific override
    hostel = models.ForeignKey(
        'hostels.Hostel',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='policy_rules',
        help_text='If set, this policy applies only to this hostel',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = 'policy_rules'
        ordering = ['key']
        constraints = [
            models.UniqueConstraint(
                fields=['key', 'hostel'],
                name='unique_policy_per_hostel',
            ),
            models.UniqueConstraint(
                fields=['key'],
                condition=models.Q(hostel__isnull=True),
                name='unique_global_policy_key',
            ),
        ]

    def __str__(self):
        scope = f" ({self.hostel.code})" if self.hostel else " (Global)"
        return f"{self.key} = {self.value}{scope}"

    def get_typed_value(self):
        """Return the value cast to the appropriate Python type."""
        if self.value_type == self.ValueType.INTEGER:
            return int(self.value)
        elif self.value_type == self.ValueType.BOOLEAN:
            return self.value.lower() in ('true', '1', 'yes')
        elif self.value_type == self.ValueType.JSON:
            import json
            return json.loads(self.value)
        return self.value
