"""
Module: backend/apps/exchange_requests/admin.py

Work / Purpose:
    Django admin site model registrations (ExchangeRequestAdmin) for apps.exchange_requests.

Connected Modules (Used By / Routes):
    - django.contrib.admin autodiscover

Helpful / Supporting Modules (Dependencies):
    - backend/apps/exchange_requests/models.py
    - django (external library / framework)
"""

from django.contrib import admin
from .models import ExchangeRequest


@admin.register(ExchangeRequest)
class ExchangeRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'current_bed', 'status', 'is_eligible', 'created_at', 'expires_at')
    list_filter = ('status', 'is_eligible')
    search_fields = ('student__email', 'student__first_name')
    raw_id_fields = ('student', 'current_bed', 'preferred_hostel', 'preferred_block', 'preferred_room', 'preferred_bed')
