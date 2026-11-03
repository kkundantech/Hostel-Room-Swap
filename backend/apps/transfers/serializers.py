"""Transfer record serializers and PDF generation."""
from rest_framework import serializers
from .models import TransferRecord
from apps.accounts.serializers import UserMinimalSerializer


class TransferRecordSerializer(serializers.ModelSerializer):
    student = UserMinimalSerializer(read_only=True)
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
            'student', 'old_bed', 'old_bed_label', 'old_hostel',
            'new_bed', 'new_bed_label', 'new_hostel',
            'approved_by', 'status', 'completed_at', 'created_at',
        ]
        read_only_fields = fields

    def get_old_bed_label(self, obj):
        return obj.old_bed.full_label if obj.old_bed else ''

    def get_new_bed_label(self, obj):
        return obj.new_bed.full_label if obj.new_bed else ''

    def get_proposal_reference(self, obj):
        return obj.proposal.reference_code if obj.proposal else ''

    def get_old_hostel(self, obj):
        return obj.old_bed.hostel.name if obj.old_bed else ''

    def get_new_hostel(self, obj):
        return obj.new_bed.hostel.name if obj.new_bed else ''
