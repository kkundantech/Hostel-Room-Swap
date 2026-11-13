"""
Module: backend/apps/proposals/views.py

Work / Purpose:
    Provides ExchangeProposalViewSet endpoints for listing proposals, viewing cycle legs, and submitting student accept/decline responses.

Connected Modules (Used By / Routes):
    - backend/apps/proposals/urls.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/permissions.py
    - backend/apps/audit/services.py
    - backend/apps/proposals/models.py
    - backend/apps/proposals/serializers.py
    - backend/apps/proposals/services.py
    - django (external library / framework)
    - django_filters (external library / framework)
    - rest_framework (external library / framework)

Original Module Notes:
    Proposal views.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from django.utils import timezone
from .models import ExchangeProposal, ProposalParticipant
from .serializers import ExchangeProposalSerializer, ProposalRespondSerializer
from .services import process_participant_response
from apps.accounts.permissions import IsStudent, IsWardenOrChiefWarden, IsStaffRole


class ExchangeProposalViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read and respond to exchange proposals.

    Students: see proposals they participate in.
    Staff: see all proposals within their scope.
    """
    serializer_class = ExchangeProposalSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'is_cross_hostel', 'cycle_length']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False) or not self.request.user.is_authenticated:
            return ExchangeProposal.objects.none()
        user = self.request.user
        qs = ExchangeProposal.objects.prefetch_related(
            'participants__student',
            'participants__current_bed__room__block__hostel',
            'participants__proposed_bed__room__block__hostel',
        ).select_related('approved_by')

        if user.role == 'STUDENT':
            return qs.filter(participants__student=user).distinct()
        elif user.role == 'WARDEN':
            assigned_hostel_ids = user.warden_assignments.filter(
                is_active=True
            ).values_list('hostel_id', flat=True)
            return qs.filter(
                participants__current_bed__room__block__hostel_id__in=assigned_hostel_ids
            ).distinct()
        return qs.all()

    @action(detail=False, methods=['get'], url_path='pending-count')
    def pending_count(self, request):
        """Return the count of proposals where the requesting student's response is pending."""
        user = request.user
        if not user.is_authenticated or user.role != 'STUDENT':
            return Response({'pending_count': 0})
        count = ProposalParticipant.objects.filter(
            student=user,
            accepted=False,
            declined=False,
            proposal__status=ExchangeProposal.Status.PENDING_ACCEPTANCE,
            proposal__expires_at__gt=timezone.now(),
        ).count()
        return Response({'pending_count': count})

    @action(detail=True, methods=['post'], url_path='respond', permission_classes=[IsStudent])
    def respond(self, request, pk=None):
        """
        Accept or decline a proposal.
        POST /api/v1/proposals/{id}/respond/
        Body: { "accepted": true/false, "note": "optional" }
        """
        proposal = self.get_object()
        serializer = ProposalRespondSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Ensure the requesting student is a participant
        try:
            participant = ProposalParticipant.objects.get(
                proposal=proposal, student=request.user
            )
        except ProposalParticipant.DoesNotExist:
            return Response(
                {'detail': 'You are not a participant in this proposal.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            updated_proposal = process_participant_response(
                participant=participant,
                accepted=serializer.validated_data['accepted'],
                note=serializer.validated_data.get('note', ''),
            )
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        from apps.audit.services import log_audit_event
        action_code = 'PROPOSAL_ACCEPTED' if serializer.validated_data['accepted'] else 'PROPOSAL_DECLINED'
        log_audit_event(
            user=request.user,
            action=action_code,
            description=f'{request.user.email} {action_code.lower().split("_")[1]} proposal {proposal.reference_code}',
            target_type='ExchangeProposal',
            target_id=proposal.id,
            request=request,
        )

        return Response(ExchangeProposalSerializer(updated_proposal).data)
