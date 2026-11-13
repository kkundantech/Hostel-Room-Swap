"""
Module: backend/apps/matching/views.py

Work / Purpose:
    Exposes admin/warden endpoints to trigger the cycle matching engine and inspect matching run status.

Connected Modules (Used By / Routes):
    - backend/apps/matching/urls.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/permissions.py
    - backend/apps/exchange_requests/models.py
    - backend/apps/matching/engine.py
    - backend/apps/policies/services.py
    - backend/apps/proposals/models.py
    - backend/apps/proposals/services.py
    - django (external library / framework)
    - rest_framework (external library / framework)

Original Module Notes:
    Views for triggering and viewing matching results.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status

from apps.accounts.permissions import IsHostelAdmin, IsStaffRole
from apps.policies.services import get_policy_value
from .engine import run_matching
from drf_spectacular.utils import extend_schema, OpenApiTypes


@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([IsHostelAdmin])
def run_matching_view(request):
    """
    Trigger the matching engine.
    Returns detected cycles and performance metrics.
    Also creates proposals for newly detected cycles.

    POST /api/v1/matches/run/
    """
    req_max = request.data.get('max_length') if hasattr(request, 'data') and request.data else None
    try:
        max_length = int(req_max) if req_max is not None else get_policy_value('MAX_CYCLE_LENGTH', default=5)
    except (ValueError, TypeError):
        max_length = get_policy_value('MAX_CYCLE_LENGTH', default=5)
    max_length = min(max(2, max_length), 10)  # Clamp 2-10

    cycles, metrics = run_matching(max_length=max_length)

    # Create proposals for detected cycles
    from apps.proposals.services import create_proposal_from_cycle
    created_proposals = []
    skipped = 0

    for cycle in cycles:
        proposal = create_proposal_from_cycle(cycle)
        if proposal:
            created_proposals.append(proposal.id)
        else:
            skipped += 1

    return Response({
        'metrics': metrics,
        'proposals_created': len(created_proposals),
        'proposals_skipped': skipped,
        'proposal_ids': created_proposals,
    })


@extend_schema(responses={200: OpenApiTypes.OBJECT})
@api_view(['GET'])
@permission_classes([IsStaffRole])
def matching_status_view(request):
    """
    Get statistics about current matching state.
    GET /api/v1/matches/
    """
    from apps.exchange_requests.models import ExchangeRequest
    from apps.proposals.models import ExchangeProposal
    from django.utils import timezone

    open_count = ExchangeRequest.objects.filter(
        status='OPEN', is_eligible=True, expires_at__gt=timezone.now()
    ).count()
    pending_proposals = ExchangeProposal.objects.filter(
        status__in=['PENDING_ACCEPTANCE', 'PENDING_APPROVAL']
    ).count()

    return Response({
        'open_eligible_requests': open_count,
        'pending_proposals': pending_proposals,
    })
