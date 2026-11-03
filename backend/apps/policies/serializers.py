"""Serializers for policy rules."""
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

    def get_typed_value(self, obj):
        return obj.get_typed_value()
