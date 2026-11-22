"""
Module: backend/apps/transfers/serializers.py

Work / Purpose:
    Serializes TransferRecord history rows for students, wardens, and administrators.

Connected Modules (Used By / Routes):
    - backend/apps/transfers/views.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/serializers.py
    - backend/apps/transfers/models.py
    - rest_framework (external library / framework)

Original Module Notes:
    Transfer record serializers and PDF generation.
"""
from rest_framework import serializers
from .models import TransferRecord
from apps.accounts.serializers import UserMinimalSerializer


class TransferRecordSerializer(serializers.ModelSerializer):
    student = UserMinimalSerializer(read_only=True)
    student_name = serializers.SerializerMethodField()
    student_email = serializers.SerializerMethodField()
    old_bed_label = serializers.SerializerMethodField()
    new_bed_label = serializers.SerializerMethodField()
    approved_by = UserMinimalSerializer(read_only=True)
    proposal_reference = serializers.SerializerMethodField()
    old_hostel = serializers.SerializerMethodField()
    new_hostel = serializers.SerializerMethodField()

    class Meta:
        model = TransferRecord
        fields = [
            'id', 'transfer_id', 'proposal', 'proposal_reference',
            'student', 'student_name', 'student_email',
            'old_bed', 'old_bed_label', 'old_hostel',
            'new_bed', 'new_bed_label', 'new_hostel',
            'approved_by', 'status', 'completed_at', 'created_at',
        ]
        read_only_fields = fields

    def get_student_name(self, obj) -> str:
        if not obj.student:
            return 'Resident Student'
        return obj.student.get_full_name() or getattr(obj.student, 'registration_number', '') or obj.student.email

    def get_student_email(self, obj) -> str:
        return obj.student.email if obj.student else ''

    def get_old_bed_label(self, obj) -> str:
        return obj.old_bed.full_label if obj.old_bed else ''

    def get_new_bed_label(self, obj) -> str:
        return obj.new_bed.full_label if obj.new_bed else ''

    def get_proposal_reference(self, obj) -> str:
        return obj.proposal.reference_code if obj.proposal else ''

    def get_old_hostel(self, obj) -> str:
        try:
            return obj.old_bed.hostel.name if obj.old_bed else ''
        except Exception:
            return ''

    def get_new_hostel(self, obj) -> str:
        try:
            return obj.new_bed.hostel.name if obj.new_bed else ''
        except Exception:
            return ''
