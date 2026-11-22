"""
Module: backend/apps/audit/views.py

Work / Purpose:
    Exposes read-only AuditEntryViewSet endpoints with filtering and search for admins and super admins.

Connected Modules (Used By / Routes):
    - backend/apps/audit/urls.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/permissions.py
    - backend/apps/audit/models.py
    - backend/apps/audit/serializers.py
    - django_filters (external library / framework)
    - rest_framework (external library / framework)

Original Module Notes:
    Views for audit trail.
"""
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
        if getattr(self, 'swagger_fake_view', False) or not self.request.user.is_authenticated:
            return AuditEntry.objects.none()
        user = self.request.user
        qs = AuditEntry.objects.select_related('user')
        if user.role in ('SUPER_ADMIN', 'HOSTEL_ADMIN') or user.is_superuser:
            return qs.all()
        # Scoped isolation: non-admin staff only see actions they performed
        return qs.filter(user=user)
