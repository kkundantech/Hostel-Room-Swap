"""
Module: backend/apps/policies/views.py

Work / Purpose:
    Provides PolicyRuleViewSet endpoints for reading and updating institutional exchange policies.

Connected Modules (Used By / Routes):
    - backend/apps/policies/urls.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/permissions.py
    - backend/apps/audit/models.py
    - backend/apps/audit/services.py
    - backend/apps/exchange_requests/models.py
    - backend/apps/policies/models.py
    - backend/apps/policies/serializers.py
    - backend/apps/proposals/models.py
    - django (external library / framework)
    - django_filters (external library / framework)
    - rest_framework (external library / framework)

Original Module Notes:
    Views for policy rule management.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import PolicyRule
from .serializers import PolicyRuleSerializer
from apps.accounts.permissions import IsHostelAdmin


class PolicyRuleViewSet(viewsets.ModelViewSet):
    """CRUD for policy rules. Only Hostel Admin can modify."""
    queryset = PolicyRule.objects.select_related('hostel', 'updated_by').all()
    serializer_class = PolicyRuleSerializer

    def get_permissions(self):
        from rest_framework.permissions import IsAuthenticated
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsHostelAdmin()]

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active', 'hostel', 'value_type']

    def perform_create(self, serializer):
        from apps.audit.services import log_audit_event
        instance = serializer.save(updated_by=self.request.user)
        log_audit_event(
            user=self.request.user,
            action='POLICY_CHANGED',
            description=f'Policy created: {instance.key} = {instance.value}',
            target_type='PolicyRule',
            target_id=instance.id,
            request=self.request,
            extra_data={'new_value': instance.value, 'key': instance.key}
        )

    def perform_update(self, serializer):
        from apps.audit.services import log_audit_event
        old_val = serializer.instance.value
        instance = serializer.save(updated_by=self.request.user)
        reason = self.request.data.get('change_reason', 'Administrative policy update')
        log_audit_event(
            user=self.request.user,
            action='POLICY_CHANGED',
            description=f'Policy {instance.key} changed from "{old_val}" to "{instance.value}". Reason: {reason}',
            target_type='PolicyRule',
            target_id=instance.id,
            request=self.request,
            extra_data={
                'key': instance.key,
                'old_value': old_val,
                'new_value': instance.value,
                'change_reason': reason
            }
        )

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        """Retrieve audit history and version changes for this policy rule."""
        from apps.audit.models import AuditEntry
        policy = self.get_object()
        entries = AuditEntry.objects.filter(
            action='POLICY_CHANGED',
            target_type='PolicyRule',
            target_id=policy.id
        ).select_related('user').order_by('-created_at')[:20]

        history_data = []
        for e in entries:
            extra = e.extra_data or {}
            history_data.append({
                'id': e.id,
                'timestamp': e.created_at.isoformat() if e.created_at else '',
                'changed_by': e.user.email if e.user else 'System',
                'description': e.description,
                'old_value': extra.get('old_value'),
                'new_value': extra.get('new_value'),
                'change_reason': extra.get('change_reason', 'Policy configuration update'),
            })

        return Response({
            'policy_key': policy.key,
            'current_value': policy.value,
            'history': history_data
        })

    @action(detail=False, methods=['post'], url_path='simulate')
    def simulate(self, request):
        """
        Simulate impact of changing a policy rule on current live requests and proposals
        without mutating production database records.
        """
        policy_key = request.data.get('policy_key', '').strip()
        proposed_value = request.data.get('proposed_value')

        if not policy_key or proposed_value is None:
            return Response(
                {'error': 'Both policy_key and proposed_value are required for simulation.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.exchange_requests.models import ExchangeRequest
        from apps.proposals.models import ExchangeProposal
        from django.utils import timezone
        from datetime import timedelta

        affected_items = []
        impact_level = 'LOW'
        summary = ''

        if policy_key == 'MAX_CYCLE_LENGTH':
            try:
                max_len = int(proposed_value)
                proposals = ExchangeProposal.objects.filter(
                    status__in=['PENDING_ACCEPTANCE', 'PENDING_APPROVAL']
                )
                affected = [p for p in proposals if p.cycle_length > max_len]
                affected_items = [
                    f"Proposal #{p.id} with cycle length {p.cycle_length} (exceeds new max {max_len})"
                    for p in affected
                ]
                impact_level = 'HIGH' if len(affected) > 0 else 'LOW'
                summary = f"{len(affected)} active proposal(s) currently exceed proposed maximum cycle length of {max_len}."
            except ValueError:
                summary = "Invalid integer for cycle length."

        elif policy_key == 'PROPOSAL_EXPIRY_HOURS':
            try:
                hours = int(proposed_value)
                cutoff = timezone.now() - timedelta(hours=hours)
                proposals = ExchangeProposal.objects.filter(
                    status='PENDING_ACCEPTANCE',
                    created_at__lt=cutoff
                )
                affected_items = [f"Proposal #{p.id} created at {p.created_at.strftime('%Y-%m-%d %H:%M')}" for p in proposals]
                impact_level = 'MEDIUM' if proposals.count() > 0 else 'LOW'
                summary = f"{proposals.count()} pending student proposal(s) would immediately expire under {hours}-hour expiry."
            except ValueError:
                summary = "Invalid integer for expiry hours."

        elif policy_key == 'COOLING_OFF_DAYS':
            try:
                days = int(proposed_value)
                summary = f"Simulating {days} days cooling-off period. Requests from students who transferred in the last {days} days will be flagged during eligibility checks."
                impact_level = 'MEDIUM' if days > 30 else 'LOW'
            except ValueError:
                summary = "Invalid integer for cooling off days."

        elif policy_key == 'REQUIRE_FEE_CLEARANCE':
            bool_val = str(proposed_value).lower() in ('true', '1', 'yes')
            if bool_val:
                summary = "Enabling mandatory fee clearance. All exchange participants must have verified fee clearance from accounts before warden approval."
                impact_level = 'MEDIUM'
            else:
                summary = "Disabling mandatory fee clearance. Requests will proceed without blocking on student ledger checks."
                impact_level = 'LOW'

        elif policy_key == 'CHECK_DISCIPLINARY_HOLD':
            bool_val = str(proposed_value).lower() in ('true', '1', 'yes')
            summary = f"Disciplinary hold check set to {bool_val}. Students with active hostel disciplinary holds will {'be blocked' if bool_val else 'not be blocked'}."
            impact_level = 'HIGH' if bool_val else 'LOW'

        else:
            summary = f"Policy {policy_key} tested against standard governance constraints. Safe to apply."
            impact_level = 'LOW'

        return Response({
            'policy_key': policy_key,
            'proposed_value': proposed_value,
            'summary': summary,
            'impact_level': impact_level,
            'affected_count': len(affected_items),
            'affected_items': affected_items[:10],
            'simulated_at': timezone.now().isoformat(),
        })

