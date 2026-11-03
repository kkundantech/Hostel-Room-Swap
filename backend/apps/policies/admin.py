from django.contrib import admin
from .models import PolicyRule


@admin.register(PolicyRule)
class PolicyRuleAdmin(admin.ModelAdmin):
    list_display = ('key', 'value', 'value_type', 'hostel', 'is_active', 'updated_at')
    list_filter = ('value_type', 'is_active', 'hostel')
    search_fields = ('key', 'description')
