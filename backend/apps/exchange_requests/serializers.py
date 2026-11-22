"""
Module: backend/apps/exchange_requests/serializers.py

Work / Purpose:
    Validates and serializes ExchangeRequest creation, listing, and status updates against policy rules.

Connected Modules (Used By / Routes):
    - backend/apps/exchange_requests/views.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/serializers.py
    - backend/apps/exchange_requests/models.py
    - backend/apps/hostels/models.py
    - backend/apps/hostels/serializers.py
    - backend/apps/hostels/views.py
    - backend/apps/policies/services.py
    - backend/apps/proposals/models.py
    - django (external library / framework)
    - rest_framework (external library / framework)

Original Module Notes:
    Serializers for exchange requests.
"""
from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta

from .models import ExchangeRequest
from apps.accounts.serializers import UserMinimalSerializer
from apps.hostels.serializers import BedSerializer, HostelMinimalSerializer
from apps.policies.services import get_policy_value


class ExchangeRequestCreateSerializer(serializers.ModelSerializer):
    """Used when creating a new exchange request."""

    preferred_floor = serializers.CharField(required=False, allow_blank=True, write_only=True)
    floor_warning = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ExchangeRequest
        fields = [
            'id', 'preferred_hostel', 'preferred_block',
            'preferred_room', 'preferred_bed', 'preferred_floor', 'reason',
            'floor_warning',
        ]

    def get_floor_warning(self, obj) -> str | None:
        last_val = getattr(obj, 'last_validation', {}) or {}
        return last_val.get('floor_warning')

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

            # Check floor availability on preferred hostel (e.g. BH1, BH2)
            preferred_floor = data.get('preferred_floor') or ''
            reason_text = data.get('reason', '')
            floor_eval_text = f"{preferred_floor} {reason_text}".lower()

            from apps.hostels.models import Room
            from django.db.models import Max
            room_max = Room.objects.filter(block__hostel=pref_hostel, is_active=True).aggregate(m=Max('floor'))['m'] or 0
            block_max = pref_hostel.blocks.filter(is_active=True).aggregate(m=Max('floor_count'))['m'] or 0
            max_floor = max(room_max, block_max, 1)
            active_floors = list(
                Room.objects.filter(block__hostel=pref_hostel, is_active=True)
                .values_list('floor', flat=True)
                .distinct()
            )

            is_unavailable = False
            for fl in [5, 4, 3, 2]:
                if f"{fl}th floor" in floor_eval_text or f"floor {fl}" in floor_eval_text or f"{fl} floor" in floor_eval_text:
                    if fl > max_floor or (active_floors and fl not in active_floors):
                        is_unavailable = True
                    break
            if not is_unavailable and ("3rd or 4th" in floor_eval_text or "3rd/4th" in floor_eval_text):
                if 4 > max_floor or (active_floors and 3 not in active_floors and 4 not in active_floors):
                    is_unavailable = True

            if is_unavailable:
                data['_floor_warning'] = "Currently it is not available, maybe in future you can try."

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
        floor_warning = validated_data.pop('_floor_warning', None)
        validated_data.pop('preferred_floor', None)
        user = self.context['request'].user
        validity_days = get_policy_value('REQUEST_VALIDITY_DAYS', default=14)
        expires_at = timezone.now() + timedelta(days=validity_days)

        # Run initial eligibility check
        from apps.policies.services import validate_student_eligibility
        report = validate_student_eligibility(user)
        val_dict = report.to_dict()
        if floor_warning:
            val_dict['floor_warning'] = floor_warning
            val_dict['has_floor_warning'] = True

        return ExchangeRequest.objects.create(
            student=user,
            expires_at=expires_at,
            is_eligible=report.is_eligible,
            last_validation=val_dict,
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
    floor_warning = serializers.SerializerMethodField()

    class Meta:
        model = ExchangeRequest
        fields = [
            'id', 'student', 'current_bed', 'current_bed_label',
            'status', 'preferred_hostel', 'preferred_hostel_name',
            'preferred_block', 'preferred_room', 'preferred_bed',
            'reason', 'is_eligible', 'last_validation',
            'created_at', 'updated_at', 'expires_at', 'completed_at',
            'days_remaining', 'hostel_name', 'active_proposal',
            'floor_warning',
        ]
        read_only_fields = fields

    def get_floor_warning(self, obj) -> str | None:
        last_val = obj.last_validation or {}
        if last_val.get('floor_warning'):
            return last_val['floor_warning']
        pref_hostel = obj.preferred_hostel
        if pref_hostel and obj.reason:
            reason_lower = obj.reason.lower()
            code = (pref_hostel.code or '').upper()
            if '4th floor' in reason_lower or '5th floor' in reason_lower or '3rd or 4th floor' in reason_lower:
                if code in ('BH1', 'BH2', 'GH1'):
                    return "Currently it is not available, maybe in future you can try."
        return None

    def get_current_bed_label(self, obj) -> str:
        return obj.current_bed.full_label if obj.current_bed else "N/A"

    def get_hostel_name(self, obj) -> str | None:
        try:
            return obj.current_bed.room.block.hostel.name
        except Exception:
            return None

    def get_preferred_hostel_name(self, obj) -> str | None:
        return obj.preferred_hostel.name if obj.preferred_hostel else None

    def get_days_remaining(self, obj) -> int | None:
        if obj.expires_at:
            delta = obj.expires_at - timezone.now()
            return max(0, delta.days)
        return None

    def get_active_proposal(self, obj) -> dict | None:
        from apps.proposals.models import ProposalParticipant
        participant = ProposalParticipant.objects.filter(
            student=obj.student,
            proposal__status__in=['PENDING_ACCEPTANCE', 'PENDING_APPROVAL'],
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
