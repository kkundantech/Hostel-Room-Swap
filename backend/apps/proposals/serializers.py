"""Proposal serializers."""
from rest_framework import serializers
from django.utils import timezone

from .models import ExchangeProposal, ProposalParticipant
from apps.accounts.serializers import UserMinimalSerializer


class ProposalParticipantSerializer(serializers.ModelSerializer):
    student = UserMinimalSerializer(read_only=True)
    current_bed_label = serializers.SerializerMethodField()
    proposed_bed_label = serializers.SerializerMethodField()
    response_status = serializers.SerializerMethodField()

    class Meta:
        model = ProposalParticipant
        fields = [
            'id', 'student', 'current_bed', 'current_bed_label',
            'proposed_bed', 'proposed_bed_label', 'accepted', 'declined',
            'responded_at', 'response_note', 'response_status',
        ]

    def get_current_bed_label(self, obj):
        return obj.current_bed.full_label

    def get_proposed_bed_label(self, obj):
        return obj.proposed_bed.full_label

    def get_response_status(self, obj):
        if obj.accepted:
            return 'ACCEPTED'
        if obj.declined:
            return 'DECLINED'
        return 'PENDING'


class ExchangeProposalSerializer(serializers.ModelSerializer):
    participants = ProposalParticipantSerializer(many=True, read_only=True)
    approved_by = UserMinimalSerializer(read_only=True)
    is_expired = serializers.SerializerMethodField()
    acceptance_progress = serializers.SerializerMethodField()

    class Meta:
        model = ExchangeProposal
        fields = [
            'id', 'reference_code', 'status', 'cycle_length',
            'is_cross_hostel', 'expires_at', 'is_expired',
            'approved_by', 'approved_at', 'rejection_reason',
            'executed_at', 'created_at', 'updated_at',
            'participants', 'acceptance_progress',
        ]
        read_only_fields = fields

    def get_is_expired(self, obj):
        return timezone.now() > obj.expires_at

    def get_acceptance_progress(self, obj):
        total = obj.participants.count()
        accepted = obj.participants.filter(accepted=True).count()
        declined = obj.participants.filter(declined=True).count()
        return {
            'total': total,
            'accepted': accepted,
            'declined': declined,
            'pending': total - accepted - declined,
        }


class ProposalRespondSerializer(serializers.Serializer):
    """Request body for accepting/declining a proposal."""
    accepted = serializers.BooleanField()
    note = serializers.CharField(max_length=300, required=False, default='')
