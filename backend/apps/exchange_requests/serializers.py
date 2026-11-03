"""Serializers for exchange requests."""
from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta

from .models import ExchangeRequest
from apps.accounts.serializers import UserMinimalSerializer
from apps.hostels.serializers import BedSerializer, HostelMinimalSerializer
from apps.policies.services import get_policy_value


class ExchangeRequestCreateSerializer(serializers.ModelSerializer):
    """Used when creating a new exchange request."""

    class Meta:
        model = ExchangeRequest
        fields = [
            'id', 'preferred_hostel', 'preferred_block',
            'preferred_room', 'preferred_bed', 'reason',
        ]

    def validate(self, data):
        user = self.context['request'].user

        # Check active allocation
        from apps.hostels.models import Allocation
        allocation = Allocation.objects.filter(student=user, is_active=True).first()
        if not allocation:
            raise serializers.ValidationError(
                'You do not have an active hostel allocation.'
            )

        # Check no duplicate active request
        if ExchangeRequest.objects.filter(
            student=user, status__in=['OPEN', 'MATCHED']
        ).exists():
            raise serializers.ValidationError(
                'You already have an active exchange request. '
                'Withdraw it before creating a new one.'
            )

        # Server-side validation of preferred hostel against student eligibility
        pref_hostel = data.get('preferred_hostel')
        if pref_hostel:
            from apps.hostels.views import get_user_allowed_hostel_categories
            allowed_cats = get_user_allowed_hostel_categories(user)
            if pref_hostel.hostel_category not in allowed_cats:
                raise serializers.ValidationError({
                    'preferred_hostel': (
                        f"Hostel {pref_hostel.name} ({pref_hostel.get_hostel_category_display()}) "
                        "is not compatible with your verified hostel eligibility. "
                        "Cross-gender hostel selections are strictly prohibited by university policy."
                    )
                })

        pref_block = data.get('preferred_block')
        if pref_block:
            student_gender = getattr(getattr(user, 'student_profile', None), 'gender', 'MALE')
            if pref_block.gender_restriction not in (student_gender, 'ANY'):
                raise serializers.ValidationError({
                    'preferred_block': (
                        f"Block {pref_block.name} is restricted to {pref_block.get_gender_restriction_display()} students."
                    )
                })

        data['current_bed'] = allocation.bed
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        validity_days = get_policy_value('REQUEST_VALIDITY_DAYS', default=14)
        expires_at = timezone.now() + timedelta(days=validity_days)

        # Run initial eligibility check
        from apps.policies.services import validate_student_eligibility
        report = validate_student_eligibility(user)

        return ExchangeRequest.objects.create(
            student=user,
            expires_at=expires_at,
            is_eligible=report.is_eligible,
            last_validation=report.to_dict(),
            **validated_data,
        )


class ExchangeRequestSerializer(serializers.ModelSerializer):
    """Full read serializer for exchange requests."""
    student = UserMinimalSerializer(read_only=True)
    current_bed_label = serializers.SerializerMethodField()
    preferred_hostel_name = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    hostel_name = serializers.SerializerMethodField()
    active_proposal = serializers.SerializerMethodField()

    class Meta:
        model = ExchangeRequest
        fields = [
            'id', 'student', 'current_bed', 'current_bed_label',
            'status', 'preferred_hostel', 'preferred_hostel_name',
            'preferred_block', 'preferred_room', 'preferred_bed',
            'reason', 'is_eligible', 'last_validation',
            'created_at', 'updated_at', 'expires_at', 'completed_at',
            'days_remaining', 'hostel_name', 'active_proposal',
        ]
        read_only_fields = fields

    def get_current_bed_label(self, obj):
        return obj.current_bed.full_label if obj.current_bed else "N/A"

    def get_hostel_name(self, obj):
        try:
            return obj.current_bed.room.block.hostel.name
        except Exception:
            return None

    def get_preferred_hostel_name(self, obj):
        return obj.preferred_hostel.name if obj.preferred_hostel else None

    def get_days_remaining(self, obj):
        if obj.expires_at:
            delta = obj.expires_at - timezone.now()
            return max(0, delta.days)
        return None

    def get_active_proposal(self, obj):
        from apps.proposals.models import ProposalParticipant
        participant = ProposalParticipant.objects.filter(
            student=obj.student
        ).select_related('proposal').order_by('-proposal__created_at').first()

        if not participant:
            return None

        proposal = participant.proposal
        all_participants = proposal.participants.select_related('student', 'current_bed__room__block__hostel', 'proposed_bed__room__block__hostel').all()
        accepted_count = sum(1 for p in all_participants if p.accepted)

        return {
            'id': proposal.id,
            'reference_code': proposal.reference_code,
            'status': proposal.status,
            'cycle_length': proposal.cycle_length,
            'is_cross_hostel': proposal.is_cross_hostel,
            'accepted_count': accepted_count,
            'total_participants': len(all_participants),
            'expires_at': proposal.expires_at,
            'rejection_reason': proposal.rejection_reason,
            'participants': [
                {
                    'id': p.id,
                    'student_id': p.student_id,
                    'student_name': p.student.get_full_name() or p.student.email,
                    'student_email': p.student.email,
                    'current_bed': p.current_bed.full_label if p.current_bed else 'N/A',
                    'proposed_bed': p.proposed_bed.full_label if p.proposed_bed else 'N/A',
                    'accepted': p.accepted,
                    'declined': p.declined,
                    'responded_at': p.responded_at,
                }
                for p in all_participants
            ]
        }


class ExchangeRequestUpdateSerializer(serializers.ModelSerializer):
    """Used when editing an OPEN request."""

    class Meta:
        model = ExchangeRequest
        fields = [
            'preferred_hostel', 'preferred_block',
            'preferred_room', 'preferred_bed', 'reason',
        ]

    def validate(self, data):
        instance = self.instance
        if instance.status != ExchangeRequest.Status.OPEN:
            raise serializers.ValidationError(
                f'Cannot edit a request in status "{instance.status}". '
                f'Only OPEN requests can be edited.'
            )
        return data
