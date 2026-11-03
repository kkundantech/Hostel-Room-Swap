"""Views for audit trail."""
from rest_framework import viewsets, permissions
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import AuditEntry
from .serializers import AuditEntrySerializer
from apps.accounts.permissions import IsHostelAdmin, IsStaffRole


class AuditEntryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only audit log access.
    Only Hostel Admin and staff roles can view.
    No update or delete operations.
    """
    serializer_class = AuditEntrySerializer
    permission_classes = [IsStaffRole]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['action', 'target_type', 'user']
    search_fields = ['description', 'target_type']
    ordering_fields = ['created_at', 'action']
    ordering = ['-created_at']

    def get_queryset(self):
        return AuditEntry.objects.select_related('user').all()
