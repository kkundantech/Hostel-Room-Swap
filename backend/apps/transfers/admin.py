"""
Module: backend/apps/transfers/admin.py

Work / Purpose:
    Django admin site model registrations (TransferRecordAdmin) for apps.transfers.

Connected Modules (Used By / Routes):
    - django.contrib.admin autodiscover

Helpful / Supporting Modules (Dependencies):
    - backend/apps/transfers/models.py
    - django (external library / framework)
"""

from django.contrib import admin
from .models import TransferRecord


@admin.register(TransferRecord)
class TransferRecordAdmin(admin.ModelAdmin):
    list_display = ('transfer_id', 'student', 'old_bed', 'new_bed', 'status', 'completed_at')
    list_filter = ('status',)
    search_fields = ('transfer_id', 'student__email')
    raw_id_fields = ('student', 'old_bed', 'new_bed', 'proposal', 'approved_by')

    def has_change_permission(self, request, obj=None):
        return False  # Transfer records are immutable

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
