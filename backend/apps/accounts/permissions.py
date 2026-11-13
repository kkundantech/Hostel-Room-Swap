"""
Module: backend/apps/accounts/permissions.py

Work / Purpose:
    Defines role-based DRF permission classes (IsSuperAdmin, IsSuperAdminOrAdmin, IsStudent, IsWarden, IsChiefWarden, IsWardenOrChiefWarden, IsHostelAdmin, IsDean, IsDeanReadOnly, IsAdminOrWarden).

Connected Modules (Used By / Routes):
    - backend/apps/accounts/views.py
    - backend/apps/accounts/views_super_admin.py
    - backend/apps/analytics/views.py
    - backend/apps/approvals/views.py
    - backend/apps/audit/views.py
    - backend/apps/exchange_requests/views.py
    - backend/apps/hostels/views.py
    - backend/apps/integrations/views.py
    - backend/apps/matching/views.py
    - backend/apps/policies/views.py
    - backend/apps/proposals/views.py
    - backend/apps/transfers/views.py

Helpful / Supporting Modules (Dependencies):
    - rest_framework (external library / framework)

Original Module Notes:
    Custom permissions for role-based access control.
"""
from rest_framework.permissions import BasePermission


class IsSuperAdmin(BasePermission):
    """Only Super Administrators can access this view."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == 'SUPER_ADMIN' or request.user.is_superuser)
            and getattr(request.user, 'account_status', 'ACTIVE') == 'ACTIVE'
        )


class IsSuperAdminOrAdmin(BasePermission):
    """Super Admin or Hostel Administrator."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role in ('SUPER_ADMIN', 'HOSTEL_ADMIN') or request.user.is_superuser)
            and getattr(request.user, 'account_status', 'ACTIVE') == 'ACTIVE'
        )


class IsStudent(BasePermission):
    """Students or Super Administrator can access this view."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and (request.user.role in ('STUDENT', 'SUPER_ADMIN') or request.user.is_superuser)
            and getattr(request.user, 'account_status', 'ACTIVE') == 'ACTIVE'
        )


class IsWarden(BasePermission):
    """Wardens or Super Administrator can access this view."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and (request.user.role in ('WARDEN', 'SUPER_ADMIN') or request.user.is_superuser)
            and getattr(request.user, 'account_status', 'ACTIVE') == 'ACTIVE'
        )


class IsChiefWarden(BasePermission):
    """Chief wardens or Super Administrator can access this view."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and (request.user.role in ('CHIEF_WARDEN', 'SUPER_ADMIN') or request.user.is_superuser)
            and getattr(request.user, 'account_status', 'ACTIVE') == 'ACTIVE'
        )


class IsWardenOrChiefWarden(BasePermission):
    """Wardens, chief wardens, or Super Administrator can access this view."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and (request.user.role in ('WARDEN', 'CHIEF_WARDEN', 'SUPER_ADMIN') or request.user.is_superuser)
            and getattr(request.user, 'account_status', 'ACTIVE') == 'ACTIVE'
        )


class IsHostelAdmin(BasePermission):
    """Only hostel administrators or super admin can access this view."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and (request.user.role in ('HOSTEL_ADMIN', 'SUPER_ADMIN') or request.user.is_superuser)
            and getattr(request.user, 'account_status', 'ACTIVE') == 'ACTIVE'
        )


class IsDean(BasePermission):
    """Dean of Student Welfare or Super Administrator can access this view."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and (request.user.role in ('DEAN', 'SUPER_ADMIN') or request.user.is_superuser)
            and getattr(request.user, 'account_status', 'ACTIVE') == 'ACTIVE'
        )


class IsDeanReadOnly(BasePermission):
    """Dean or Super Administrator can perform read operations."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role in ('DEAN', 'SUPER_ADMIN') or request.user.is_superuser:
            return request.method in ('GET', 'HEAD', 'OPTIONS')
        return False


class IsAdminOrWarden(BasePermission):
    """Admin, Super Admin or warden level access."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and (request.user.role in ('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'CHIEF_WARDEN') or request.user.is_superuser)
            and getattr(request.user, 'account_status', 'ACTIVE') == 'ACTIVE'
        )


class IsStaffRole(BasePermission):
    """Any staff role (Super Admin, Warden, Chief Warden, Admin, Dean)."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and (request.user.role in ('SUPER_ADMIN', 'WARDEN', 'CHIEF_WARDEN', 'HOSTEL_ADMIN', 'DEAN') or request.user.is_superuser)
            and getattr(request.user, 'account_status', 'ACTIVE') == 'ACTIVE'
        )


class IsOwnerOrStaff(BasePermission):
    """
    Object-level permission: owner of the object or staff role.
    Expects the object to have a 'user' attribute or the view to
    define get_owner_field().
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'account_status', 'ACTIVE') == 'ACTIVE'
        )

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        owner_field = getattr(view, 'owner_field', 'user')
        owner = getattr(obj, owner_field, None)
        if owner == request.user:
            return True
        return (
            request.user.role in ('SUPER_ADMIN', 'WARDEN', 'CHIEF_WARDEN', 'HOSTEL_ADMIN')
            or request.user.is_superuser
        )
