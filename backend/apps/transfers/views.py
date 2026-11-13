"""
Module: backend/apps/transfers/views.py

Work / Purpose:
    Provides TransferRecordViewSet endpoints including ReportLab PDF official room-transfer letter generation.

Connected Modules (Used By / Routes):
    - backend/apps/transfers/urls.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/permissions.py
    - backend/apps/transfers/models.py
    - backend/apps/transfers/serializers.py
    - django (external library / framework)
    - django_filters (external library / framework)
    - reportlab (external library / framework)
    - rest_framework (external library / framework)

Original Module Notes:
    Transfer views with PDF letter generation.
"""
import io
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

from .models import TransferRecord
from .serializers import TransferRecordSerializer
from apps.accounts.permissions import IsStaffRole


class TransferRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """
    View transfer records.
    Students see own. Staff see scoped. Admin sees all.
    """
    serializer_class = TransferRecordSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'student']
    search_fields = ['transfer_id', 'student__email']
    ordering_fields = ['completed_at']
    ordering = ['-completed_at']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False) or not self.request.user.is_authenticated:
            return TransferRecord.objects.none()
        user = self.request.user
        qs = TransferRecord.objects.select_related(
            'student', 'old_bed__room__block__hostel',
            'new_bed__room__block__hostel',
            'proposal', 'approved_by',
        )
        if user.role == 'STUDENT':
            return qs.filter(student=user)
        elif user.role == 'WARDEN':
            assigned_hostel_ids = user.warden_assignments.filter(
                is_active=True
            ).values_list('hostel_id', flat=True)
            return qs.filter(
                old_bed__room__block__hostel_id__in=assigned_hostel_ids
            )
        return qs.all()

    @action(detail=True, methods=['get'], url_path='letter')
    def download_letter(self, request, pk=None):
        """Generate and download a PDF transfer letter."""
        transfer = self.get_object()

        # Only the student or staff can download
        if request.user.role == 'STUDENT' and transfer.student != request.user:
            return Response(
                {'detail': 'Not authorized.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        pdf_buffer = _generate_transfer_letter_pdf(transfer)
        filename = f"transfer_letter_{transfer.transfer_id[:8]}.pdf"

        return FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=filename,
            content_type='application/pdf',
        )

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """Export filtered transfer records to CSV."""
        import csv
        from django.http import HttpResponse

        qs = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="room_transfers_report.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Transfer ID', 'Proposal Reference', 'Student Email', 'Student Name',
            'Origin Bed', 'Origin Hostel', 'Destination Bed', 'Destination Hostel',
            'Authorized By', 'Completed At', 'Status'
        ])

        for tr in qs:
            writer.writerow([
                tr.transfer_id,
                tr.proposal.reference_code if tr.proposal else '',
                tr.student.email,
                tr.student.get_full_name(),
                tr.old_bed.full_label if tr.old_bed else '',
                tr.old_bed.hostel.name if tr.old_bed else '',
                tr.new_bed.full_label if tr.new_bed else '',
                tr.new_bed.hostel.name if tr.new_bed else '',
                tr.approved_by.email if tr.approved_by else '',
                tr.completed_at.strftime('%Y-%m-%d %H:%M:%S') if tr.completed_at else '',
                tr.status,
            ])

        return response


def _generate_transfer_letter_pdf(transfer: TransferRecord) -> io.BytesIO:
    """Generate a PDF transfer authorization letter using ReportLab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch, cm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=2*cm,
        bottomMargin=2*cm,
        leftMargin=2*cm,
        rightMargin=2*cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=16,
        textColor=colors.HexColor('#1e3a5f'),
        spaceAfter=6,
        alignment=TA_CENTER,
    )
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.gray,
        alignment=TA_CENTER,
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=11,
        leading=16,
        spaceAfter=8,
    )

    story = []

    # Header
    story.append(Paragraph("HOSTEL ROOM EXCHANGE PLATFORM", title_style))
    story.append(Paragraph("Official Room Transfer Authorization Letter", header_style))
    story.append(Spacer(1, 0.5*inch))

    # Reference info
    story.append(Paragraph(f"<b>Transfer ID:</b> {transfer.transfer_id}", body_style))
    story.append(Paragraph(
        f"<b>Proposal Reference:</b> {transfer.proposal.reference_code if transfer.proposal else 'N/A'}",
        body_style,
    ))
    story.append(Paragraph(
        f"<b>Date:</b> {transfer.completed_at.strftime('%B %d, %Y at %H:%M')}",
        body_style,
    ))
    story.append(Spacer(1, 0.3*inch))

    # Student info
    story.append(Paragraph("<b>STUDENT DETAILS</b>", body_style))
    student_data = [
        ['Name', transfer.student.get_full_name()],
        ['Email', transfer.student.email],
    ]
    try:
        profile = transfer.student.student_profile
        student_data.extend([
            ['Roll Number', profile.roll_number],
            ['Department', profile.department],
        ])
    except Exception:
        pass

    student_table = Table(student_data, colWidths=[3*cm, 12*cm])
    student_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(student_table)
    story.append(Spacer(1, 0.3*inch))

    # Transfer details
    story.append(Paragraph("<b>TRANSFER DETAILS</b>", body_style))
    transfer_data = [
        ['', 'Previous Room', 'New Room'],
        ['Location', transfer.old_bed.full_label if transfer.old_bed else '-',
         transfer.new_bed.full_label if transfer.new_bed else '-'],
        ['Hostel', transfer.old_bed.hostel.name if transfer.old_bed else '-',
         transfer.new_bed.hostel.name if transfer.new_bed else '-'],
    ]
    transfer_table = Table(transfer_data, colWidths=[4*cm, 7*cm, 7*cm])
    transfer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ]))
    story.append(transfer_table)
    story.append(Spacer(1, 0.3*inch))

    # Authorization
    if transfer.approved_by:
        story.append(Paragraph(
            f"<b>Approved By:</b> {transfer.approved_by.get_full_name()} ({transfer.approved_by.role})",
            body_style,
        ))
    story.append(Paragraph(f"<b>Status:</b> {transfer.status}", body_style))
    story.append(Spacer(1, 0.5*inch))

    story.append(Paragraph(
        "This letter is computer-generated and serves as official authorization "
        "for the room transfer mentioned above.",
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=9, textColor=colors.gray),
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer
