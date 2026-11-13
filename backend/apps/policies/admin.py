"""
Module: backend/apps/policies/admin.py

Work / Purpose:
    Django admin site model registrations (PolicyRuleAdmin) for apps.policies.

Connected Modules (Used By / Routes):
    - django.contrib.admin autodiscover

Helpful / Supporting Modules (Dependencies):
    - backend/apps/policies/models.py
    - django (external library / framework)
"""

from django.contrib import admin
from .models import PolicyRule


@admin.register(PolicyRule)
class PolicyRuleAdmin(admin.ModelAdmin):
    list_display = ('key', 'value', 'value_type', 'hostel', 'is_active', 'updated_at')
    list_filter = ('value_type', 'is_active', 'hostel')
    search_fields = ('key', 'description')
