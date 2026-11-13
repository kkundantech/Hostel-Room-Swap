"""
Module: backend/apps/approvals/admin.py

Work / Purpose:
    Django admin site model registrations (ApprovalAdmin) for apps.approvals.

Connected Modules (Used By / Routes):
    - django.contrib.admin autodiscover

Helpful / Supporting Modules (Dependencies):
    - backend/apps/approvals/models.py
    - django (external library / framework)
"""

from django.contrib import admin
from .models import Approval


@admin.register(Approval)
class ApprovalAdmin(admin.ModelAdmin):
    list_display = ('proposal', 'approver', 'decision', 'decided_at')
    list_filter = ('decision',)
    raw_id_fields = ('proposal', 'approver')
