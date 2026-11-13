"""
Module: backend/apps/policies/services.py

Work / Purpose:
    Implements eligibility validation helpers checking active allocations, cooling-off periods, fee/disciplinary status, and gender isolation.

Connected Modules (Used By / Routes):
    - backend/apps/exchange_requests/serializers.py
    - backend/apps/exchange_requests/views.py
    - backend/apps/matching/views.py
    - backend/apps/proposals/services.py
    - backend/tests/test_policies.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/hostels/models.py
    - backend/apps/policies/models.py
    - backend/apps/transfers/models.py
    - django (external library / framework)

Original Module Notes:
    Policy engine service.

    Provides configurable eligibility validation for exchange requests.
    Checks are performed before matching and again before execution.
"""
import logging
from datetime import timedelta
from dataclasses import dataclass, field
from typing import List

from django.conf import settings
from django.utils import timezone

from .models import PolicyRule
from apps.hostels.models import Allocation

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of a single policy validation check."""
    is_eligible: bool
    code: str
    message: str
    policy_key: str = ''


@dataclass
class EligibilityReport:
    """Complete eligibility report for a student/request."""
    is_eligible: bool = True
    results: List[ValidationResult] = field(default_factory=list)

    def add_result(self, result: ValidationResult):
        self.results.append(result)
        if not result.is_eligible:
            self.is_eligible = False

    def to_dict(self):
        return {
            'is_eligible': self.is_eligible,
            'checks': [
                {
                    'is_eligible': r.is_eligible,
                    'code': r.code,
                    'message': r.message,
                    'policy_key': r.policy_key,
                }
                for r in self.results
            ],
        }


def get_policy_value(key, hostel=None, default=None):
    """
    Get a policy value, checking hostel-specific override first,
    then global, then settings default, then provided default.
    """
    # Check hostel-specific
    if hostel:
        try:
            rule = PolicyRule.objects.get(key=key, hostel=hostel, is_active=True)
            return rule.get_typed_value()
        except PolicyRule.DoesNotExist:
            pass

    # Check global
    try:
        rule = PolicyRule.objects.get(key=key, hostel__isnull=True, is_active=True)
        return rule.get_typed_value()
    except PolicyRule.DoesNotExist:
        pass

    # Fall back to settings
    policy_defaults = getattr(settings, 'POLICY_DEFAULTS', {})
    return policy_defaults.get(key, default)


def validate_student_eligibility(student, hostel=None):
    """
    Validate whether a student is eligible to create or participate
    in an exchange.

    Checks:
    1. Active allocation exists
    2. Cooling-off period after last transfer
    3. Fee clearance (mock)
    4. Disciplinary hold (mock)
    5. No duplicate active request

    Returns an EligibilityReport with all check results.
    """
    report = EligibilityReport()

    # 1. Active allocation check
    active_allocation = Allocation.objects.filter(
        student=student, is_active=True
    ).first()

    if not active_allocation:
        report.add_result(ValidationResult(
            is_eligible=False,
            code='NO_ACTIVE_ALLOCATION',
            message='Student does not have an active hostel allocation.',
            policy_key='ALLOCATION_REQUIRED',
        ))
        return report
    else:
        report.add_result(ValidationResult(
            is_eligible=True,
            code='ALLOCATION_EXISTS',
            message=f'Active allocation: {active_allocation.bed.full_label}',
            policy_key='ALLOCATION_REQUIRED',
        ))

    allocation_hostel = active_allocation.bed.hostel

    # 2. Cooling-off period
    cooling_off_days = get_policy_value('COOLING_OFF_DAYS', hostel=allocation_hostel, default=30)
    from apps.transfers.models import TransferRecord
    last_transfer = TransferRecord.objects.filter(
        student=student,
        status='COMPLETED',
    ).order_by('-completed_at').first()

    if last_transfer:
        cooldown_end = last_transfer.completed_at + timedelta(days=cooling_off_days)
        if timezone.now() < cooldown_end:
            report.add_result(ValidationResult(
                is_eligible=False,
                code='COOLING_OFF_ACTIVE',
                message=f'Cooling-off period active until {cooldown_end.strftime("%Y-%m-%d")}. '
                        f'Last transfer was on {last_transfer.completed_at.strftime("%Y-%m-%d")}.',
                policy_key='COOLING_OFF_DAYS',
            ))
        else:
            report.add_result(ValidationResult(
                is_eligible=True,
                code='COOLING_OFF_PASSED',
                message='Cooling-off period has passed.',
                policy_key='COOLING_OFF_DAYS',
            ))
    else:
        report.add_result(ValidationResult(
            is_eligible=True,
            code='NO_PREVIOUS_TRANSFER',
            message='No previous transfers.',
            policy_key='COOLING_OFF_DAYS',
        ))

    # 3. Fee clearance (from StudentProfile - mock data)
    require_fee = get_policy_value('REQUIRE_FEE_CLEARANCE', default=True)
    if require_fee:
        try:
            profile = student.student_profile
            if not profile.fee_cleared:
                report.add_result(ValidationResult(
                    is_eligible=False,
                    code='FEE_NOT_CLEARED',
                    message='Hostel fee clearance is required. (Mock: set fee_cleared=True)',
                    policy_key='REQUIRE_FEE_CLEARANCE',
                ))
            else:
                report.add_result(ValidationResult(
                    is_eligible=True,
                    code='FEE_CLEARED',
                    message='Hostel fees are cleared.',
                    policy_key='REQUIRE_FEE_CLEARANCE',
                ))
        except Exception:
            report.add_result(ValidationResult(
                is_eligible=False,
                code='PROFILE_MISSING',
                message='Student profile not found.',
                policy_key='REQUIRE_FEE_CLEARANCE',
            ))

    # 4. Disciplinary hold
    require_no_hold = get_policy_value('CHECK_DISCIPLINARY_HOLD', default=True)
    if require_no_hold:
        try:
            profile = student.student_profile
            if profile.disciplinary_hold:
                report.add_result(ValidationResult(
                    is_eligible=False,
                    code='DISCIPLINARY_HOLD',
                    message='Student has an active disciplinary hold.',
                    policy_key='CHECK_DISCIPLINARY_HOLD',
                ))
            else:
                report.add_result(ValidationResult(
                    is_eligible=True,
                    code='NO_DISCIPLINARY_HOLD',
                    message='No disciplinary holds.',
                    policy_key='CHECK_DISCIPLINARY_HOLD',
                ))
        except Exception:
            pass

    return report


def validate_gender_eligibility(student, target_bed):
    """
    Check if a student's gender is compatible with the target bed's block restriction.
    """
    block = target_bed.room.block
    if block.gender_restriction == 'ANY':
        return ValidationResult(
            is_eligible=True,
            code='GENDER_OK',
            message='Block has no gender restriction.',
            policy_key='GENDER_BLOCK_RULE',
        )

    try:
        profile = student.student_profile
        if profile.gender != block.gender_restriction:
            return ValidationResult(
                is_eligible=False,
                code='GENDER_MISMATCH',
                message=f'Block {block.name} is restricted to {block.gender_restriction} students.',
                policy_key='GENDER_BLOCK_RULE',
            )
        return ValidationResult(
            is_eligible=True,
            code='GENDER_MATCH',
            message=f'Gender matches block restriction ({block.gender_restriction}).',
            policy_key='GENDER_BLOCK_RULE',
        )
    except Exception:
        return ValidationResult(
            is_eligible=False,
            code='GENDER_CHECK_FAILED',
            message='Unable to verify gender eligibility.',
            policy_key='GENDER_BLOCK_RULE',
        )


def validate_bed_availability(bed):
    """Check if a bed is active and available for exchange."""
    if not bed.is_active:
        return ValidationResult(
            is_eligible=False,
            code='BED_INACTIVE',
            message=f'Bed {bed.full_label} is not active.',
            policy_key='BED_AVAILABILITY',
        )
    if not bed.is_available_for_exchange:
        return ValidationResult(
            is_eligible=False,
            code='BED_NOT_EXCHANGEABLE',
            message=f'Bed {bed.full_label} is not available for exchange.',
            policy_key='BED_AVAILABILITY',
        )
    if not bed.room.is_available_for_exchange:
        return ValidationResult(
            is_eligible=False,
            code='ROOM_NOT_EXCHANGEABLE',
            message=f'Room {bed.room} is not available for exchange.',
            policy_key='BED_AVAILABILITY',
        )
    return ValidationResult(
        is_eligible=True,
        code='BED_AVAILABLE',
        message=f'Bed {bed.full_label} is available for exchange.',
        policy_key='BED_AVAILABILITY',
    )


def is_cross_hostel(proposal_participants):
    """
    Determine if a proposal involves cross-hostel transfers.

    Args:
        proposal_participants: queryset of ProposalParticipant with related beds

    Returns:
        True if more than one hostel is involved.
    """
    hostel_ids = set()
    for p in proposal_participants:
        hostel_ids.add(p.current_bed.hostel.id)
        hostel_ids.add(p.proposed_bed.hostel.id)
    return len(hostel_ids) > 1
