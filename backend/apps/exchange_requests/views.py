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
            return qs.filter(current_bed__room__block__hostel_id__in=assigned_hostel_ids)
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
        if self.action in ('assign_review', 'add_review_note'):
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

