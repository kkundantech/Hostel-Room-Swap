"""
Module: backend/apps/exchange_requests/views.py

Work / Purpose:
    Provides ExchangeRequestViewSet endpoints for submitting, listing, filtering, and withdrawing student exchange requests.

Connected Modules (Used By / Routes):
    - backend/apps/exchange_requests/urls.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/permissions.py
    - backend/apps/audit/services.py
    - backend/apps/exchange_requests/models.py
    - backend/apps/exchange_requests/serializers.py
    - backend/apps/hostels/views.py
    - backend/apps/matching/engine.py
    - backend/apps/policies/services.py
    - backend/apps/proposals/services.py
    - django (external library / framework)
    - django_filters (external library / framework)
    - rest_framework (external library / framework)

Original Module Notes:
    Exchange request views.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import ExchangeRequest
from .serializers import (
    ExchangeRequestCreateSerializer,
    ExchangeRequestSerializer,
    ExchangeRequestUpdateSerializer,
)
from apps.accounts.permissions import IsStudent, IsStaffRole, IsAdminOrWarden
from apps.policies.services import validate_student_eligibility
from apps.audit.services import log_audit_event


class ExchangeRequestViewSet(viewsets.ModelViewSet):
    """
    CRUD for exchange requests.
    - Students create/edit/withdraw their own requests.
    - Staff (wardens, admin) can list and view all.
    """
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'is_eligible', 'preferred_hostel']
    search_fields = ['student__email', 'student__first_name', 'reason']
    ordering_fields = ['created_at', 'expires_at', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False) or not self.request.user.is_authenticated:
            return ExchangeRequest.objects.none()
        user = self.request.user
        qs = ExchangeRequest.objects.select_related(
            'student__student_profile',
            'current_bed__room__block__hostel',
            'preferred_hostel',
        )
        if user.role == 'STUDENT':
            return qs.filter(student=user)
        elif user.role == 'WARDEN':
            assigned_hostel_ids = user.warden_assignments.filter(
                is_active=True
            ).values_list('hostel_id', flat=True)
            # Wardens have visibility into requests originating from their hostel AND requests targeting their hostel
            return qs.filter(
                Q(current_bed__room__block__hostel_id__in=assigned_hostel_ids) |
                Q(preferred_hostel_id__in=assigned_hostel_ids)
            ).distinct()
        return qs.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return ExchangeRequestCreateSerializer
        if self.action in ('update', 'partial_update'):
            return ExchangeRequestUpdateSerializer
        return ExchangeRequestSerializer

    def get_permissions(self):
        if self.action in ('create', 'withdraw', 'validate_eligibility'):
            return [IsStudent()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsStudent()]
        if self.action in ('assign_review', 'add_review_note', 'approve', 'reject'):
            return [IsAdminOrWarden()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit_event(
            user=self.request.user,
            action='REQUEST_CREATED',
            description=f'Exchange request created by {self.request.user.email}',
            target_type='ExchangeRequest',
            target_id=instance.id,
            request=self.request,
        )
        try:
            from apps.notifications.services import notify_staff_request_raised
            notify_staff_request_raised(instance)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to notify staff of new request: {e}")

        self._trigger_auto_matching()

    def perform_update(self, serializer):
        instance = serializer.save()
        log_audit_event(
            user=self.request.user,
            action='REQUEST_EDITED',
            description=f'Exchange request #{instance.id} edited by {self.request.user.email}',
            target_type='ExchangeRequest',
            target_id=instance.id,
            request=self.request,
        )
        try:
            from apps.notifications.services import notify_staff_request_raised
            notify_staff_request_raised(instance)
        except Exception:
            pass

        self._trigger_auto_matching()

    def _trigger_auto_matching(self):
        try:
            from apps.matching.engine import run_matching
            from apps.proposals.services import create_proposal_from_cycle
            cycles, _ = run_matching(max_length=5)
            for cycle in cycles:
                create_proposal_from_cycle(cycle)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Auto-matching error: {e}")

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'detail': 'Use the /withdraw/ endpoint to cancel a request.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=True, methods=['post'], url_path='withdraw')
    def withdraw(self, request, pk=None):
        """Withdraw an OPEN exchange request."""
        req = self.get_object()

        if req.student != request.user:
            return Response(
                {'detail': 'You can only withdraw your own requests.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            locked_req = ExchangeRequest.objects.select_for_update().get(id=req.id)
            if locked_req.status not in (ExchangeRequest.Status.OPEN,):
                return Response(
                    {'detail': f'Cannot withdraw a request with status "{locked_req.status}".'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            locked_req.status = ExchangeRequest.Status.WITHDRAWN
            locked_req.save(update_fields=['status', 'updated_at'])
            req = locked_req

        log_audit_event(
            user=request.user,
            action='REQUEST_WITHDRAWN',
            description=f'Request #{req.id} withdrawn by {request.user.email}',
            target_type='ExchangeRequest',
            target_id=req.id,
            request=request,
        )

        return Response(ExchangeRequestSerializer(req).data)

    @action(detail=True, methods=['get'], url_path='validate')
    def validate_eligibility(self, request, pk=None):
        """Run eligibility validation and return result."""
        req = self.get_object()
        if req.student != request.user and request.user.role == 'STUDENT':
            return Response(
                {'detail': 'Not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        report = validate_student_eligibility(req.student)

        # Update cached result
        req.is_eligible = report.is_eligible
        req.last_validation = report.to_dict()
        req.save(update_fields=['is_eligible', 'last_validation', 'updated_at'])

        return Response(report.to_dict())

    @action(detail=False, methods=['get'], url_path='check-eligibility')
    def check_my_eligibility(self, request):
        """Pre-flight check for the authenticated student before creating a request."""
        if request.user.role != 'STUDENT':
            return Response({'is_eligible': True, 'checks': []})
        report = validate_student_eligibility(request.user)
        return Response(report.to_dict())

    @action(detail=False, methods=['get'], url_path='validate_eligibility')
    def validate_eligibility_alias(self, request):
        """Alias for check-eligibility."""
        return self.check_my_eligibility(request)

    @action(detail=False, methods=['get'], url_path='browse')
    def browse_available(self, request):
        """
        Browse eligible active exchange requests from other students.
        Strictly filters by the requesting student's verified gender & hostel eligibility.
        Never leaks incompatible gender hostel data or requests.
        """
        user = request.user
        if not user.is_authenticated:
            return Response([])

        if user.role != 'STUDENT':
            # Staff can see all open requests within scope
            return Response(ExchangeRequestSerializer(self.get_queryset().filter(status='OPEN'), many=True).data)

        from apps.hostels.views import get_user_allowed_hostel_categories
        allowed_cats = get_user_allowed_hostel_categories(user)
        student_gender = getattr(getattr(user, 'student_profile', None), 'gender', 'MALE')

        open_requests = ExchangeRequest.objects.filter(
            status=ExchangeRequest.Status.OPEN,
            is_eligible=True,
            current_bed__room__block__hostel__hostel_category__in=allowed_cats,
            student__student_profile__gender=student_gender,
        ).exclude(
            student=user
        ).select_related(
            'student__student_profile',
            'current_bed__room__block__hostel',
            'preferred_hostel',
        )

        return Response(ExchangeRequestSerializer(open_requests, many=True).data)

    @action(detail=True, methods=['post'], url_path='assign')
    def assign_review(self, request, pk=None):
        """Assign an exchange request to an authorized warden or record internal admin note."""
        req = self.get_object()
        assigned_to = request.data.get('assigned_to', '')
        notes = request.data.get('notes', '')

        # Store note in last_validation / metadata
        val_data = req.last_validation or {}
        val_data['assigned_warden'] = assigned_to
        val_data['review_assignment_note'] = notes
        val_data['assigned_at'] = request.data.get('timestamp')
        val_data['assigned_by'] = request.user.email
        req.last_validation = val_data
        req.save(update_fields=['last_validation', 'updated_at'])

        log_audit_event(
            user=request.user,
            action='DATA_MODIFIED',
            description=f'Request #{req.id} assigned for review to {assigned_to}. Note: {notes}',
            target_type='ExchangeRequest',
            target_id=req.id,
            request=request,
            extra_data={'assigned_to': assigned_to, 'notes': notes}
        )

        return Response(ExchangeRequestSerializer(req).data)

    @action(detail=True, methods=['post'], url_path='review-note')
    def add_review_note(self, request, pk=None):
        """Append an internal administrative review note to the request record."""
        req = self.get_object()
        note = request.data.get('note', '').strip()
        if not note:
            return Response({'error': 'Note text cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)

        val_data = req.last_validation or {}
        existing_notes = val_data.get('admin_notes', [])
        from django.utils import timezone
        existing_notes.append({
            'author': request.user.email,
            'note': note,
            'timestamp': timezone.now().isoformat(),
        })
        val_data['admin_notes'] = existing_notes
        req.last_validation = val_data
        req.save(update_fields=['last_validation', 'updated_at'])

        log_audit_event(
            user=request.user,
            action='DATA_MODIFIED',
            description=f'Admin review note added to Request #{req.id}: {note}',
            target_type='ExchangeRequest',
            target_id=req.id,
            request=request,
        )

        return Response(ExchangeRequestSerializer(req).data)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """
        Warden or Admin approves a student's exchange request and executes
        the room transfer to a selected vacant bed atomically.
        """
        from apps.hostels.models import Bed, Allocation
        from apps.transfers.models import TransferRecord
        from apps.notifications.services import send_notification
        from apps.notifications.models import Notification
        from django.utils import timezone

        req = self.get_object()
        if req.status != ExchangeRequest.Status.OPEN:
            return Response(
                {'detail': f'Cannot approve request with status "{req.status}". Only OPEN requests can be approved.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_bed_id = request.data.get('target_bed_id') or request.data.get('bed_id')
        remarks = (request.data.get('remarks') or '').strip() or 'Approved by hostel warden'

        if not target_bed_id:
            # Check if student's preferred_bed is set and vacant
            if req.preferred_bed and not Allocation.objects.filter(bed=req.preferred_bed, is_active=True).exists():
                target_bed_id = req.preferred_bed_id
            else:
                return Response(
                    {'detail': 'A valid vacant target bed must be selected for room allocation.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            locked_req = ExchangeRequest.objects.select_for_update().get(id=req.id)
            if locked_req.status != ExchangeRequest.Status.OPEN:
                return Response(
                    {'detail': 'Request is no longer OPEN.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check target bed
            try:
                target_bed = Bed.objects.select_for_update().select_related('room__block__hostel').get(id=target_bed_id)
            except Bed.DoesNotExist:
                return Response({'detail': 'Selected bed does not exist.'}, status=status.HTTP_404_NOT_FOUND)

            if not target_bed.is_active:
                return Response({'detail': 'Selected bed is currently inactive.'}, status=status.HTTP_400_BAD_REQUEST)

            # Check occupancy
            if Allocation.objects.filter(bed=target_bed, is_active=True).exists():
                return Response({'detail': 'Selected bed is already occupied. Please select a vacant bed.'}, status=status.HTTP_400_BAD_REQUEST)

            # Check warden scope
            if request.user.role == 'WARDEN':
                assigned_hostel_ids = request.user.warden_assignments.filter(
                    is_active=True
                ).values_list('hostel_id', flat=True)
                if target_bed.room.block.hostel_id not in assigned_hostel_ids:
                    return Response(
                        {'detail': 'You are not authorized to allocate beds in this hostel.'},
                        status=status.HTTP_403_FORBIDDEN,
                    )

            # Student active allocation
            student = locked_req.student
            student_gender = getattr(getattr(student, 'student_profile', None), 'gender', None)
            if student_gender:
                block_gender = target_bed.room.block.gender_restriction
                if block_gender not in (student_gender, 'ANY'):
                    return Response(
                        {'detail': f'Policy violation: Student gender ({student_gender}) does not match block policy ({block_gender}).'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                hostel_cat = target_bed.room.block.hostel.hostel_category
                if hostel_cat == 'BOYS' and student_gender != 'MALE':
                    return Response(
                        {'detail': 'Policy violation: Non-male student cannot be allocated to a Boys Hostel.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                elif hostel_cat == 'GIRLS' and student_gender != 'FEMALE':
                    return Response(
                        {'detail': 'Policy violation: Non-female student cannot be allocated to a Girls Hostel.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            old_alloc = Allocation.objects.filter(student=student, is_active=True).first()
            old_bed = old_alloc.bed if old_alloc else locked_req.current_bed

            # Deactivate old allocation
            if old_alloc:
                old_alloc.is_active = False
                old_alloc.deallocated_at = timezone.now()
                old_alloc.save(update_fields=['is_active', 'deallocated_at', 'updated_at'])

            # Create new active allocation
            new_alloc = Allocation.objects.create(
                student=student,
                bed=target_bed,
                is_active=True,
                reason='Exchange Request Approved',
            )

            # Create immutable TransferRecord
            transfer_rec = TransferRecord.objects.create(
                student=student,
                old_bed=old_bed,
                new_bed=target_bed,
                old_allocation=old_alloc,
                new_allocation=new_alloc,
                approved_by=request.user,
                completed_at=timezone.now(),
                status=TransferRecord.Status.COMPLETED,
            )

            # Mark exchange request as COMPLETED
            locked_req.status = ExchangeRequest.Status.COMPLETED
            val_data = locked_req.last_validation or {}
            val_data['approved_by'] = request.user.email
            val_data['approval_remarks'] = remarks
            val_data['allocated_bed_id'] = target_bed.id
            val_data['allocated_bed_label'] = f"{target_bed.room.block.hostel.code}/{target_bed.room.block.name}/{target_bed.room.room_number}/Bed-{target_bed.bed_number}"
            val_data['transfer_record_id'] = str(transfer_rec.transfer_id)
            val_data['approved_at'] = timezone.now().isoformat()
            locked_req.last_validation = val_data
            locked_req.save(update_fields=['status', 'last_validation', 'updated_at'])

            # Log audit event
            log_audit_event(
                user=request.user,
                action='EXCHANGE_EXECUTED',
                description=f'Vacant room exchange approved for {student.email} into {target_bed}. Remarks: {remarks}',
                target_type='ExchangeRequest',
                target_id=locked_req.id,
                request=request,
                extra_data={
                    'student_id': student.id,
                    'old_bed': str(old_bed) if old_bed else 'N/A',
                    'new_bed': str(target_bed),
                    'transfer_id': str(transfer_rec.transfer_id),
                    'remarks': remarks,
                }
            )

            # In-app alert to student
            send_notification(
                recipient=student,
                notif_type=Notification.NotifType.TRANSFER_COMPLETED,
                title='Room Change Request Approved!',
                message=f'Your room change request has been approved by the hostel warden. You have been assigned bed {target_bed}. Transfer reference: {transfer_rec.transfer_id}.',
                related_type='TransferRecord',
                related_id=transfer_rec.id,
            )

        return Response({
            'status': 'SUCCESS',
            'message': f'Room transfer executed successfully for {student.email}. New bed: {target_bed}.',
            'transfer_id': str(transfer_rec.transfer_id),
            'allocated_bed': str(target_bed),
            'request': ExchangeRequestSerializer(locked_req).data,
        })

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """Warden or Admin rejects a student's exchange request."""
        from apps.notifications.services import send_notification
        from apps.notifications.models import Notification
        from django.utils import timezone

        req = self.get_object()
        if req.status != ExchangeRequest.Status.OPEN:
            return Response(
                {'detail': f'Cannot reject request with status "{req.status}". Only OPEN requests can be rejected.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = (request.data.get('reason') or '').strip() or 'Disapproved by hostel administration'

        with transaction.atomic():
            locked_req = ExchangeRequest.objects.select_for_update().get(id=req.id)
            if locked_req.status != ExchangeRequest.Status.OPEN:
                return Response(
                    {'detail': 'Request is no longer OPEN.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            locked_req.status = ExchangeRequest.Status.CANCELLED
            val_data = locked_req.last_validation or {}
            val_data['rejected_by'] = request.user.email
            val_data['rejection_reason'] = reason
            val_data['rejected_at'] = timezone.now().isoformat()
            locked_req.last_validation = val_data
            locked_req.save(update_fields=['status', 'last_validation', 'updated_at'])

            log_audit_event(
                user=request.user,
                action='PROPOSAL_REJECTED',
                description=f'Exchange request #{locked_req.id} rejected by {request.user.email}: {reason}',
                target_type='ExchangeRequest',
                target_id=locked_req.id,
                request=request,
                extra_data={'reason': reason}
            )

            send_notification(
                recipient=locked_req.student,
                notif_type=Notification.NotifType.PROPOSAL_REJECTED,
                title='Room Change Request Update',
                message=f'Your room change request #{locked_req.id} was not approved. Reason: {reason}',
                related_type='ExchangeRequest',
                related_id=locked_req.id,
            )

        return Response({
            'status': 'SUCCESS',
            'message': f'Request #{locked_req.id} rejected.',
            'request': ExchangeRequestSerializer(locked_req).data,
        })

