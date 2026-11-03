from django.contrib import admin
from .models import ExchangeRequest


@admin.register(ExchangeRequest)
class ExchangeRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'current_bed', 'status', 'is_eligible', 'created_at', 'expires_at')
    list_filter = ('status', 'is_eligible')
    search_fields = ('student__email', 'student__first_name')
    raw_id_fields = ('student', 'current_bed', 'preferred_hostel', 'preferred_block', 'preferred_room', 'preferred_bed')
