"""
Module: backend/apps/proposals/admin.py

Work / Purpose:
    Django admin site model registrations (ExchangeProposalAdmin, ProposalParticipantAdmin) for apps.proposals.

Connected Modules (Used By / Routes):
    - django.contrib.admin autodiscover

Helpful / Supporting Modules (Dependencies):
    - backend/apps/proposals/models.py
    - django (external library / framework)
"""

from django.contrib import admin
from .models import ExchangeProposal, ProposalParticipant


@admin.register(ExchangeProposal)
class ExchangeProposalAdmin(admin.ModelAdmin):
    list_display = ('reference_code', 'status', 'cycle_length', 'is_cross_hostel', 'expires_at', 'created_at')
    list_filter = ('status', 'is_cross_hostel', 'cycle_length')
    search_fields = ('reference_code',)


@admin.register(ProposalParticipant)
class ProposalParticipantAdmin(admin.ModelAdmin):
    list_display = ('student', 'proposal', 'current_bed', 'proposed_bed', 'accepted', 'declined')
    list_filter = ('accepted', 'declined')
    raw_id_fields = ('student', 'proposal', 'current_bed', 'proposed_bed')
