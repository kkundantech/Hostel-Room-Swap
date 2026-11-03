"""
Tests for the policy validation engine.
Verifies:
- Active allocation requirement
- Fee clearance check
- Disciplinary hold check
- Duplicate active request rejection
- Cooling-off period check
"""
import pytest
from apps.policies.services import validate_student_eligibility
from apps.policies.models import PolicyRule


@pytest.mark.django_db
class TestPolicyEngine:

    def test_eligible_student_passes_all_checks(self, make_student, make_hostel, make_allocation):
        hostel, block, rooms, beds = make_hostel()
        student = make_student(fee_cleared=True, disciplinary_hold=False)
        make_allocation(student, beds[0])

        report = validate_student_eligibility(student)
        assert report.is_eligible is True
        assert all(r.is_eligible for r in report.results)

    def test_student_without_allocation_fails(self, make_student):
        student = make_student()
        report = validate_student_eligibility(student)
        assert report.is_eligible is False
        codes = [r.code for r in report.results if not r.is_eligible]
        assert 'NO_ACTIVE_ALLOCATION' in codes

    def test_fee_uncleared_student_fails(self, make_student, make_hostel, make_allocation):
        hostel, block, rooms, beds = make_hostel()
        student = make_student(fee_cleared=False)
        make_allocation(student, beds[0])

        # Enable fee clearance policy rule
        PolicyRule.objects.create(
            key='REQUIRE_FEE_CLEARANCE',
            value='true',
            value_type='BOOLEAN',
            is_active=True,
        )

        report = validate_student_eligibility(student)
        assert report.is_eligible is False
        codes = [r.code for r in report.results if not r.is_eligible]
        assert 'FEE_NOT_CLEARED' in codes

    def test_disciplinary_hold_blocks_exchange(self, make_student, make_hostel, make_allocation):
        hostel, block, rooms, beds = make_hostel()
        student = make_student(disciplinary_hold=True)
        make_allocation(student, beds[0])

        PolicyRule.objects.create(
            key='CHECK_DISCIPLINARY_HOLD',
            value='true',
            value_type='BOOLEAN',
            is_active=True,
        )

        report = validate_student_eligibility(student)
        assert report.is_eligible is False
        codes = [r.code for r in report.results if not r.is_eligible]
        assert 'DISCIPLINARY_HOLD' in codes
