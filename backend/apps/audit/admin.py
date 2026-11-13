"""
Module: backend/apps/audit/admin.py

Work / Purpose:
    Django admin site model registrations (AuditEntryAdmin) for apps.audit.

Connected Modules (Used By / Routes):
    - django.contrib.admin autodiscover

Helpful / Supporting Modules (Dependencies):
    - backend/apps/audit/models.py
    - django (external library / framework)
"""

from django.contrib import admin
from .models import AuditEntry


@admin.register(AuditEntry)
class AuditEntryAdmin(admin.ModelAdmin):
    list_display = ('action', 'user', 'description', 'target_type', 'target_id', 'created_at')
    list_filter = ('action', 'target_type')
    search_fields = ('description',)
    readonly_fields = ('user', 'action', 'description', 'target_type', 'target_id',
                       'ip_address', 'user_agent', 'extra_data', 'created_at')
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
