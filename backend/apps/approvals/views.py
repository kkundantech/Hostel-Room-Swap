"""
Module: backend/apps/approvals/views.py

Work / Purpose:
    Provides ApprovalViewSet and ProposalApprovalViewSet endpoints for reviewing pending proposals and triggering atomic swap approval/rejection.

Connected Modules (Used By / Routes):
    - backend/apps/approvals/urls.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/permissions.py
    - backend/apps/approvals/models.py
    - backend/apps/approvals/services.py
    - backend/apps/proposals/models.py
    - backend/apps/proposals/serializers.py
    - django_filters (external library / framework)
    - rest_framework (external library / framework)

Original Module Notes:
    Approval views.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers as drf_serializers
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes

from .models import Approval
from .services import approve_proposal, reject_proposal
from apps.proposals.models import ExchangeProposal
from apps.proposals.serializers import ExchangeProposalSerializer
from apps.accounts.permissions import IsWardenOrChiefWarden, IsHostelAdmin, IsAdminOrWarden


class ApprovalActionSerializer(drf_serializers.Serializer):
    remarks = drf_serializers.CharField(max_length=1000, required=False, default='')


class ApprovalViewSet(viewsets.ModelViewSet):
    """Historical approval decision records for wardens and admins."""

    class ApprovalSerializer(drf_serializers.ModelSerializer):
        approver_name = drf_serializers.CharField(source='approver.get_full_name', read_only=True)
        approver_email = drf_serializers.CharField(source='approver.email', read_only=True)
        proposal_reference = drf_serializers.CharField(source='proposal.reference_code', read_only=True)
        created_at = drf_serializers.DateTimeField(source='decided_at', read_only=True)

        class Meta:
            model = Approval
            fields = ['id', 'proposal', 'proposal_reference', 'approver', 'approver_name', 'approver_email', 'decision', 'remarks', 'decided_at', 'created_at']
            read_only_fields = fields

    serializer_class = ApprovalSerializer
    permission_classes = [IsAdminOrWarden]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['decision', 'proposal']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False) or not self.request.user.is_authenticated:
            return Approval.objects.none()
        user = self.request.user
        qs = Approval.objects.select_related('approver', 'proposal')
        if user.role == 'WARDEN':
            return qs.filter(approver=user)
        return qs.all()

    def http_method_not_allowed(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)


class ProposalApprovalViewSet(viewsets.ViewSet):
    """
    Viewset for approve/reject actions and queue inspection on proposals.
    Accessible by wardens, chief wardens, and admin.
    """
    serializer_class = ApprovalActionSerializer
    permission_classes = [IsAdminOrWarden]

    @action(detail=False, methods=['get'], url_path='queue')
    def queue(self, request):
        """Get proposals awaiting warden approval that the current warden can approve."""
        user = request.user
        qs = ExchangeProposal.objects.filter(
            status=ExchangeProposal.Status.PENDING_APPROVAL,
        ).prefetch_related(
            'participants__student',
            'participants__current_bed__room__block__hostel',
            'participants__proposed_bed__room__block__hostel',
        ).select_related('approved_by')

        if user.role == 'WARDEN':
            assigned_hostel_ids = set(
                user.warden_assignments.filter(is_active=True).values_list('hostel_id', flat=True)
            )
            # Wardens only see non-cross-hostel proposals within their assigned hostels
            eligible_proposals = []
            for p in qs.filter(is_cross_hostel=False):
                hostel_ids = set(p.participants.values_list('current_bed__room__block__hostel_id', flat=True))
                if hostel_ids.issubset(assigned_hostel_ids):
                    eligible_proposals.append(p)
            return Response(ExchangeProposalSerializer(eligible_proposals, many=True).data)

        elif user.role in ('CHIEF_WARDEN', 'HOSTEL_ADMIN', 'DEAN'):
            # Chief warden and Admin see all pending approvals
            return Response(ExchangeProposalSerializer(qs, many=True).data)

        return Response([])

    @extend_schema(
        parameters=[OpenApiParameter('id', OpenApiTypes.INT, OpenApiParameter.PATH)],
        request=ApprovalActionSerializer,
        responses={200: ExchangeProposalSerializer},
    )
    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """Approve a proposal and execute the exchange atomically."""
        serializer = ApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            proposal = approve_proposal(
                proposal_id=int(pk),
                warden=request.user,
                remarks=serializer.validated_data.get('remarks', ''),
            )
        except PermissionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'detail': f'Execution failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(ExchangeProposalSerializer(proposal).data)

    @extend_schema(
        parameters=[OpenApiParameter('id', OpenApiTypes.INT, OpenApiParameter.PATH)],
        request=ApprovalActionSerializer,
        responses={200: ExchangeProposalSerializer},
    )
    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """Reject a proposal with mandatory remarks."""
        serializer = ApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        remarks = serializer.validated_data.get('remarks', '')
        if not remarks:
            return Response(
                {'detail': 'Rejection remarks are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            proposal = reject_proposal(
                proposal_id=int(pk),
                warden=request.user,
                remarks=remarks,
            )
        except PermissionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ExchangeProposalSerializer(proposal).data)
