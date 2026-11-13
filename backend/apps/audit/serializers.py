"""
Module: backend/apps/audit/serializers.py

Work / Purpose:
    Serializes AuditEntry records for read-only admin and super-admin audit log APIs.

Connected Modules (Used By / Routes):
    - backend/apps/accounts/views_super_admin.py
    - backend/apps/audit/views.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/serializers.py
    - backend/apps/audit/models.py
    - rest_framework (external library / framework)

Original Module Notes:
    Serializers for audit entries.
"""
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
