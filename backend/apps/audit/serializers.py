"""Serializers for audit entries."""
from rest_framework import serializers
from .models import AuditEntry
from apps.accounts.serializers import UserMinimalSerializer


class AuditEntrySerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)

    class Meta:
        model = AuditEntry
        fields = [
            'id', 'user', 'action', 'description',
            'target_type', 'target_id', 'ip_address',
            'extra_data', 'created_at',
        ]
        read_only_fields = fields  # Audit entries are immutable
