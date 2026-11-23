"""
Module: backend/apps/accounts/views_super_admin.py

Work / Purpose:
    Implements Super Admin endpoints for managing authorized identities, suspending/reactivating/revoking accounts, audit logs, and system metrics.

Connected Modules (Used By / Routes):
    - backend/apps/accounts/urls.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/models.py
    - backend/apps/accounts/otp.py
    - backend/apps/accounts/permissions.py
    - backend/apps/accounts/serializers.py
    - backend/apps/audit/models.py
    - backend/apps/audit/serializers.py
    - backend/apps/audit/services.py
    - django (external library / framework)
    - rest_framework (external library / framework)

Original Module Notes:
    Super Admin Account Authorization & Management Views.
    Strict server-side role enforcement and append-only audit logging.
"""
import csv
import io
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.db import transaction, models
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import (
    AuthorizedIdentity,
    User,
    WardenAssignment,
    AuthorizedStudent,
    AuthorizedWarden,
    OTPChallenge,
)
from .serializers import (
    AuthorizedIdentitySerializer,
    AddStudentIdentitySerializer,
    AddWardenIdentitySerializer,
    AddAdminIdentitySerializer,
)
from .permissions import IsSuperAdmin, IsSuperAdminOrAdmin
from .otp import create_identity_otp_challenge
from apps.audit.models import AuditEntry
from apps.audit.serializers import AuditEntrySerializer
from apps.audit.services import log_audit_event
from drf_spectacular.utils import extend_schema, OpenApiTypes

User = get_user_model()


class SuperAdminIdentityViewSet(viewsets.ModelViewSet):
    """
    CRUD and actions for Authorized Identities.
    Super Admin has full access.
    Admins can view and manage students and wardens only, but CANNOT create/manage Admins or Super Admins.
    """
    queryset = AuthorizedIdentity.objects.all().order_by('-created_at')
    serializer_class = AuthorizedIdentitySerializer
    permission_classes = [IsSuperAdminOrAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get('role')
        activation_status = self.request.query_params.get('activation_status')
        authorization_status = self.request.query_params.get('authorization_status')
        search = self.request.query_params.get('search')

        if role:
            qs = qs.filter(role=role)
        if activation_status:
            qs = qs.filter(activation_status=activation_status)
        if authorization_status:
            qs = qs.filter(authorization_status=authorization_status)
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(institution_id__icontains=search) |
                Q(name__icontains=search) |
                Q(trusted_email__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """
        Delete an authorized identity and its linked user credentials.
        - Super Admin can delete any user identity (except their own active self).
        - Admins can only delete students and wardens.
        - Cascades cleanup of OTP challenges, warden assignments, and User accounts.
        """
        identity = self.get_object()

        # Prevent user from deleting their own active account
        if request.user.is_authenticated:
            is_self_email = identity.trusted_email.strip().lower() == (request.user.email or '').strip().lower()
            reg_num = getattr(request.user, 'registration_number', '') or ''
            w_id = getattr(request.user, 'warden_id', '') or ''
            is_self_id = (reg_num and identity.institution_id.strip().upper() == reg_num.strip().upper()) or \
                         (w_id and identity.institution_id.strip().upper() == w_id.strip().upper())
            if is_self_email or is_self_id:
                return Response(
                    {'detail': 'You cannot delete your own currently logged-in account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Privilege check: only SUPER_ADMIN or superuser can delete administrative accounts
        if identity.role in (User.Role.HOSTEL_ADMIN, User.Role.SUPER_ADMIN):
            if not (request.user.role == User.Role.SUPER_ADMIN or request.user.is_superuser):
                return Response(
                    {'detail': 'Permission denied: Only Super Administrator can delete administrative accounts.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        inst_id = identity.institution_id
        email = identity.trusted_email
        role = identity.role

        with transaction.atomic():
            # Delete any OTP challenges
            OTPChallenge.objects.filter(
                models.Q(authorized_identity=identity)
                | models.Q(identifier__iexact=inst_id)
                | models.Q(identifier__iexact=email)
            ).delete()

            # Find all linked users
            linked_users = set(identity.user_accounts.all())
            matching_by_email = User.objects.filter(
                models.Q(email__iexact=email)
                | models.Q(registration_number__iexact=inst_id)
                | models.Q(warden_id__iexact=inst_id)
            )
            for u in matching_by_email:
                linked_users.add(u)

            for u in linked_users:
                WardenAssignment.objects.filter(warden=u).delete()
                u.delete()

            # Clean up from legacy roster tables if present
            AuthorizedStudent.objects.filter(
                models.Q(registration_number__iexact=inst_id) | models.Q(email__iexact=email)
            ).delete()
            AuthorizedWarden.objects.filter(
                models.Q(warden_id__iexact=inst_id) | models.Q(email__iexact=email)
            ).delete()

            # Delete the identity record itself
            identity.delete()

        log_audit_event(
            user=request.user,
            action='IDENTITY_DELETED',
            description=f"Identity {inst_id} ({email}, {role}) permanently deleted by {request.user.email}.",
            target_type='AuthorizedIdentity',
            target_id=kwargs.get('pk'),
            request=request,
        )

        return Response(
            {'detail': f"Identity {inst_id} ({email}) deleted successfully."},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['post'], url_path='students')
    def add_student(self, request):
        """Provision a single authorized student identity."""
        serializer = AddStudentIdentitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        identity = AuthorizedIdentity.objects.create(
            institution_id=data['registration_number'],
            name=data['full_name'],
            trusted_email=data['email'],
            role=User.Role.STUDENT,
            eligibility_classification=data.get('eligibility_classification', 'BOYS'),
            gender=data.get('gender', 'MALE'),
            department=data.get('department', ''),
            year_of_study=data.get('year_of_study', 1),
            initial_hostel_code=data.get('initial_hostel_code', ''),
            initial_room=data.get('initial_room', ''),
            initial_bed=data.get('initial_bed', ''),
            authorization_status=AuthorizedIdentity.AuthorizationStatus.ACTIVE,
            activation_status=AuthorizedIdentity.ActivationStatus.INVITED,
            created_by=request.user,
        )

        AuthorizedStudent.objects.update_or_create(
            registration_number=identity.institution_id,
            defaults={
                'email': identity.trusted_email,
                'full_name': identity.name,
                'gender': identity.gender,
                'approved_eligibility': identity.eligibility_classification,
                'department': identity.department,
                'year_of_study': identity.year_of_study,
                'initial_hostel_code': identity.initial_hostel_code,
                'initial_room': identity.initial_room,
                'initial_bed': identity.initial_bed,
                'authorization_status': 'ACTIVE',
            }
        )

        log_audit_event(
            user=request.user,
            action='IDENTITY_AUTHORIZED',
            description=f"Student identity authorized: {identity.institution_id} ({identity.trusted_email})",
            target_type='AuthorizedIdentity',
            target_id=identity.id,
            request=request,
        )

        return Response(AuthorizedIdentitySerializer(identity).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='wardens')
    def add_warden(self, request):
        """Provision an authorized warden identity."""
        serializer = AddWardenIdentitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        identity = AuthorizedIdentity.objects.create(
            institution_id=data['warden_id'],
            name=data['full_name'],
            trusted_email=data['email'],
            role=data.get('role', User.Role.WARDEN),
            assigned_hostel_ids=data.get('assigned_hostel_ids', []),
            permissions=data.get('permissions', []),
            authorization_status=AuthorizedIdentity.AuthorizationStatus.ACTIVE,
            activation_status=AuthorizedIdentity.ActivationStatus.INVITED,
            created_by=request.user,
        )

        AuthorizedWarden.objects.update_or_create(
            warden_id=identity.institution_id,
            defaults={
                'email': identity.trusted_email,
                'full_name': identity.name,
                'authorization_status': 'ACTIVE',
            }
        )

        log_audit_event(
            user=request.user,
            action='IDENTITY_AUTHORIZED',
            description=f"Warden identity authorized: {identity.institution_id} ({identity.trusted_email}) role {identity.role}",
            target_type='AuthorizedIdentity',
            target_id=identity.id,
            request=request,
        )

        return Response(AuthorizedIdentitySerializer(identity).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='admins', permission_classes=[IsSuperAdmin])
    def add_admin(self, request):
        """
        Provision an authorized administrator identity.
        STRICT REQUIREMENT: Only Super Admin can authorize Admins.
        """
        # Extra explicit server-side authorization check
        if not (request.user.role == 'SUPER_ADMIN' or request.user.is_superuser):
            return Response({
                'detail': 'Permission denied: Only Super Administrator can authorize new Admin accounts.'
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = AddAdminIdentitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        identity = AuthorizedIdentity.objects.create(
            institution_id=data['staff_id'],
            name=data['full_name'],
            trusted_email=data['email'],
            role=data.get('role', User.Role.HOSTEL_ADMIN),
            permissions=data.get('permissions', ['MANAGE_STUDENTS', 'MANAGE_WARDENS', 'VIEW_REPORTS']),
            authorization_status=AuthorizedIdentity.AuthorizationStatus.ACTIVE,
            activation_status=AuthorizedIdentity.ActivationStatus.INVITED,
            created_by=request.user,
        )

        log_audit_event(
            user=request.user,
            action='IDENTITY_AUTHORIZED',
            description=f"Admin identity authorized by SuperAdmin: {identity.institution_id} ({identity.trusted_email})",
            target_type='AuthorizedIdentity',
            target_id=identity.id,
            request=request,
        )

        return Response(AuthorizedIdentitySerializer(identity).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='resend-invitation')
    def resend_invitation(self, request, pk=None):
        """Resend OTP invitation challenge to the authorized user's trusted email."""
        identity = self.get_object()

        if identity.authorization_status in ('SUSPENDED', 'REVOKED'):
            return Response({
                'detail': 'Cannot send invitation to a suspended or revoked identity.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if identity.activation_status == AuthorizedIdentity.ActivationStatus.ACTIVE:
            return Response({
                'detail': 'Account is already activated.'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            challenge = create_identity_otp_challenge(identity=identity, request=request)
        except Exception as e:
            detail_msg = getattr(e, 'detail', str(e))
            if isinstance(detail_msg, dict):
                detail_msg = detail_msg.get('detail', str(detail_msg))
            return Response({'detail': detail_msg}, status=status.HTTP_400_BAD_REQUEST)

        log_audit_event(
            user=request.user,
            action='INVITATION_RESENT',
            description=f"Activation invitation resent to {identity.role} {identity.institution_id} ({identity.trusted_email})",
            target_type='AuthorizedIdentity',
            target_id=identity.id,
            request=request,
        )

        return Response({
            'detail': f"Activation invitation and OTP resent to {identity.trusted_email}.",
            'last_invitation_sent_at': identity.last_invitation_sent_at,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='import-csv')
    def import_csv(self, request):
        """
        Secure bulk student identity authorization via CSV.
        Validates every row and produces an error report.
        """
        csv_file = request.FILES.get('file')
        if not csv_file:
            # Check if sent as text in body
            raw_content = request.data.get('content')
            if raw_content:
                f = io.StringIO(raw_content)
            else:
                return Response({'detail': 'CSV file or content required.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            try:
                decoded_file = csv_file.read().decode('utf-8-sig')
                f = io.StringIO(decoded_file)
            except Exception as e:
                return Response({'detail': f'Failed to decode file: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(f)
        created_count = 0
        errors = []

        for row_idx, row in enumerate(reader, start=2):
            # Normalize keys
            norm_row = {k.strip().lower().replace(' ', '_'): v.strip() for k, v in row.items() if k}

            reg_no = norm_row.get('registration_number') or norm_row.get('reg_no') or norm_row.get('institution_id')
            email = norm_row.get('email') or norm_row.get('trusted_email')
            name = norm_row.get('name') or norm_row.get('full_name') or 'Student'
            eligibility = (norm_row.get('eligibility') or norm_row.get('eligibility_classification') or 'BOYS').upper()
            gender = (norm_row.get('gender') or 'MALE').upper()
            dept = norm_row.get('department', '')
            year = norm_row.get('year', '1')

            if not reg_no or not email:
                errors.append({'row': row_idx, 'error': 'Missing required registration_number or email.'})
                continue

            # Validate email
            try:
                validate_email(email)
            except DjangoValidationError:
                errors.append({'row': row_idx, 'error': f'Invalid email format: {email}'})
                continue

            clean_reg = reg_no.strip().upper()
            clean_email = email.strip().lower()

            if AuthorizedIdentity.objects.filter(institution_id__iexact=clean_reg).exists():
                errors.append({'row': row_idx, 'error': f'Registration number {clean_reg} already authorized.'})
                continue

            if AuthorizedIdentity.objects.filter(trusted_email__iexact=clean_email).exists():
                errors.append({'row': row_idx, 'error': f'Email {clean_email} already authorized.'})
                continue

            try:
                year_int = int(year)
            except ValueError:
                year_int = 1

            AuthorizedIdentity.objects.create(
                institution_id=clean_reg,
                name=name,
                trusted_email=clean_email,
                role=User.Role.STUDENT,
                eligibility_classification=eligibility if eligibility in ('BOYS', 'GIRLS', 'COED') else 'BOYS',
                gender=gender if gender in ('MALE', 'FEMALE', 'OTHER') else 'MALE',
                department=dept,
                year_of_study=year_int,
                authorization_status=AuthorizedIdentity.AuthorizationStatus.ACTIVE,
                activation_status=AuthorizedIdentity.ActivationStatus.INVITED,
                created_by=request.user,
            )
            created_count += 1

        log_audit_event(
            user=request.user,
            action='IDENTITY_AUTHORIZED',
            description=f"CSV import completed: {created_count} identities authorized, {len(errors)} errors",
            request=request,
        )

        return Response({
            'created_count': created_count,
            'errors_count': len(errors),
            'errors': errors,
        }, status=status.HTTP_200_OK if created_count > 0 else status.HTTP_400_BAD_REQUEST)


# ============================================================================
# ACCOUNT STATUS MANAGEMENT & SESSION REVOCATION
# ============================================================================

@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([IsSuperAdminOrAdmin])
def suspend_account_view(request, pk):
    """
    Suspend an authorized account.
    Immediately increments session_version and marks inactive to revoke active sessions.
    Supports either AuthorizedIdentity ID or User ID.
    """
    identity = AuthorizedIdentity.objects.filter(pk=pk).first()
    target_user = None
    if not identity:
        target_user = User.objects.filter(pk=pk).first()
        if target_user and target_user.authorized_identity:
            identity = target_user.authorized_identity

    if not identity and not target_user:
        return Response({'detail': 'Authorized identity or user not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Protect Super Admin accounts from being suspended by normal admins
    target_role = identity.role if identity else target_user.role
    if target_role == User.Role.SUPER_ADMIN and not (request.user.role == 'SUPER_ADMIN' or request.user.is_superuser):
        return Response({'detail': 'Permission denied: Cannot suspend Super Admin.'}, status=status.HTTP_403_FORBIDDEN)

    with transaction.atomic():
        if identity:
            identity.authorization_status = AuthorizedIdentity.AuthorizationStatus.SUSPENDED
            identity.activation_status = AuthorizedIdentity.ActivationStatus.SUSPENDED
            identity.save(update_fields=['authorization_status', 'activation_status', 'updated_at'])

            for user in identity.user_accounts.all():
                user.account_status = 'SUSPENDED'
                user.is_active = False
                user.session_version += 1
                user.save(update_fields=['account_status', 'is_active', 'session_version'])
            target_label = f"{identity.institution_id} ({identity.trusted_email})"
            target_id = identity.id
        else:
            target_user.account_status = 'SUSPENDED'
            target_user.is_active = False
            target_user.session_version += 1
            target_user.save(update_fields=['account_status', 'is_active', 'session_version'])
            target_label = target_user.email
            target_id = target_user.id

        log_audit_event(
            user=request.user,
            action='ACCOUNT_SUSPENDED',
            description=f"Account suspended and sessions revoked for {target_label}",
            target_type='AuthorizedIdentity' if identity else 'User',
            target_id=target_id,
            request=request,
        )

    return Response({
        'detail': f"Account {target_label} has been suspended and active sessions revoked.",
        'status': 'SUSPENDED',
    }, status=status.HTTP_200_OK)


@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([IsSuperAdminOrAdmin])
def reactivate_account_view(request, pk):
    """Reactivate a previously suspended account."""
    identity = AuthorizedIdentity.objects.filter(pk=pk).first()
    target_user = None
    if not identity:
        target_user = User.objects.filter(pk=pk).first()
        if target_user and target_user.authorized_identity:
            identity = target_user.authorized_identity

    if not identity and not target_user:
        return Response({'detail': 'Authorized identity or user not found.'}, status=status.HTTP_404_NOT_FOUND)

    with transaction.atomic():
        if identity:
            identity.authorization_status = AuthorizedIdentity.AuthorizationStatus.ACTIVE
            has_user = identity.user_accounts.exists()
            identity.activation_status = (
                AuthorizedIdentity.ActivationStatus.ACTIVE
                if has_user
                else AuthorizedIdentity.ActivationStatus.INVITED
            )
            identity.save(update_fields=['authorization_status', 'activation_status', 'updated_at'])

            for user in identity.user_accounts.all():
                user.account_status = 'ACTIVE'
                user.is_active = True
                user.save(update_fields=['account_status', 'is_active'])
            target_label = f"{identity.institution_id} ({identity.trusted_email})"
            target_id = identity.id
        else:
            target_user.account_status = 'ACTIVE'
            target_user.is_active = True
            target_user.save(update_fields=['account_status', 'is_active'])
            target_label = target_user.email
            target_id = target_user.id

        log_audit_event(
            user=request.user,
            action='ACCOUNT_REACTIVATED',
            description=f"Account reactivated for {target_label}",
            target_type='AuthorizedIdentity' if identity else 'User',
            target_id=target_id,
            request=request,
        )

    return Response({
        'detail': f"Account {target_label} has been reactivated.",
        'status': 'ACTIVE',
    }, status=status.HTTP_200_OK)


@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([IsSuperAdminOrAdmin])
def revoke_account_view(request, pk):
    """Permanently revoke authorization and terminate all active sessions."""
    identity = AuthorizedIdentity.objects.filter(pk=pk).first()
    target_user = None
    if not identity:
        target_user = User.objects.filter(pk=pk).first()
        if target_user and target_user.authorized_identity:
            identity = target_user.authorized_identity

    if not identity and not target_user:
        return Response({'detail': 'Authorized identity or user not found.'}, status=status.HTTP_404_NOT_FOUND)

    target_role = identity.role if identity else target_user.role
    if target_role == User.Role.SUPER_ADMIN and not (request.user.role == 'SUPER_ADMIN' or request.user.is_superuser):
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    now = timezone.now()

    with transaction.atomic():
        if identity:
            identity.authorization_status = AuthorizedIdentity.AuthorizationStatus.REVOKED
            identity.activation_status = AuthorizedIdentity.ActivationStatus.REVOKED
            identity.revoked_at = now
            identity.save(update_fields=['authorization_status', 'activation_status', 'revoked_at', 'updated_at'])

            for user in identity.user_accounts.all():
                user.account_status = 'REVOKED'
                user.is_active = False
                user.session_version += 1
                user.save(update_fields=['account_status', 'is_active', 'session_version'])
            target_label = f"{identity.institution_id} ({identity.trusted_email})"
            target_id = identity.id
        else:
            target_user.account_status = 'REVOKED'
            target_user.is_active = False
            target_user.session_version += 1
            target_user.save(update_fields=['account_status', 'is_active', 'session_version'])
            target_label = target_user.email
            target_id = target_user.id

        log_audit_event(
            user=request.user,
            action='ACCOUNT_REVOKED',
            description=f"Account permanently revoked and sessions terminated for {target_label}",
            target_type='AuthorizedIdentity' if identity else 'User',
            target_id=target_id,
            request=request,
        )

    return Response({
        'detail': f"Account access for {target_label} has been permanently revoked.",
        'status': 'REVOKED',
    }, status=status.HTTP_200_OK)


# ============================================================================
# AUDIT LOGS & EXECUTIVE METRICS
# ============================================================================

@extend_schema(responses={200: OpenApiTypes.OBJECT})
@api_view(['GET'])
@permission_classes([IsSuperAdminOrAdmin])
def super_admin_audit_logs_view(request):
    """Fetch append-only security and administrative audit trail."""
    action = request.query_params.get('action')
    search = request.query_params.get('search')
    user_id = request.query_params.get('user_id')

    qs = AuditEntry.objects.all().select_related('user').order_by('-created_at')

    if action:
        qs = qs.filter(action=action)
    if user_id:
        qs = qs.filter(user_id=user_id)
    if search:
        search = search.strip()
        qs = qs.filter(Q(description__icontains=search) | Q(action__icontains=search))

    # Paginate manually or return up to 100 recent
    entries = qs[:100]
    serializer = AuditEntrySerializer(entries, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(responses={200: OpenApiTypes.OBJECT})
@api_view(['GET'])
@permission_classes([IsSuperAdminOrAdmin])
def super_admin_metrics_view(request):
    """Executive metrics for Super Admin Dashboard."""
    total_authorized = AuthorizedIdentity.objects.count()
    students_count = AuthorizedIdentity.objects.filter(role=User.Role.STUDENT).count()
    wardens_count = AuthorizedIdentity.objects.filter(role__in=[User.Role.WARDEN, User.Role.CHIEF_WARDEN]).count()
    admins_count = AuthorizedIdentity.objects.filter(role__in=[User.Role.HOSTEL_ADMIN, User.Role.SUPER_ADMIN]).count()

    active_count = AuthorizedIdentity.objects.filter(activation_status=AuthorizedIdentity.ActivationStatus.ACTIVE).count()
    pending_count = AuthorizedIdentity.objects.filter(activation_status=AuthorizedIdentity.ActivationStatus.PENDING_ACTIVATION).count()
    invited_count = AuthorizedIdentity.objects.filter(activation_status=AuthorizedIdentity.ActivationStatus.INVITED).count()
    suspended_count = AuthorizedIdentity.objects.filter(authorization_status=AuthorizedIdentity.AuthorizationStatus.SUSPENDED).count()
    revoked_count = AuthorizedIdentity.objects.filter(authorization_status=AuthorizedIdentity.AuthorizationStatus.REVOKED).count()

    activation_rate = round((active_count / total_authorized * 100), 1) if total_authorized > 0 else 0

    return Response({
        'total_authorized': total_authorized,
        'by_role': {
            'students': students_count,
            'wardens': wardens_count,
            'admins': admins_count,
        },
        'by_status': {
            'active': active_count,
            'pending_activation': pending_count,
            'invited': invited_count,
            'suspended': suspended_count,
            'revoked': revoked_count,
        },
        'activation_rate': activation_rate,
    }, status=status.HTTP_200_OK)
