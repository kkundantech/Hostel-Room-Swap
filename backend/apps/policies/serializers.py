"""
Module: backend/apps/policies/serializers.py

Work / Purpose:
    Validates and serializes PolicyRule records for admin and warden configuration APIs.

Connected Modules (Used By / Routes):
    - backend/apps/policies/views.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/policies/models.py
    - rest_framework (external library / framework)

Original Module Notes:
    Serializers for policy rules.
"""
from typing import Any
from rest_framework import serializers
from .models import PolicyRule


class PolicyRuleSerializer(serializers.ModelSerializer):
    typed_value = serializers.SerializerMethodField()

    class Meta:
        model = PolicyRule
        fields = [
            'id', 'key', 'value', 'value_type', 'description',
            'is_active', 'hostel', 'typed_value', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_typed_value(self, obj) -> Any:
        return obj.get_typed_value()
