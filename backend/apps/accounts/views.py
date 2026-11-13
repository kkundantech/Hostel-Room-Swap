"""
Module: backend/apps/accounts/views.py

Work / Purpose:
    Implements authentication, password reset, student/warden OTP registration, profile (/me), and admin roster management API views.

Connected Modules (Used By / Routes):
    - backend/apps/accounts/urls.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/authentication.py
    - backend/apps/accounts/models.py
    - backend/apps/accounts/otp.py
    - backend/apps/accounts/permissions.py
    - backend/apps/accounts/serializers.py
    - backend/apps/audit/services.py
    - backend/apps/hostels/models.py
    - django (external library / framework)
    - django_filters (external library / framework)
    - rest_framework (external library / framework)
    - rest_framework_simplejwt (external library / framework)

Original Module Notes:
    Authentication, registration, OTP verification, and user management views.
"""
import csv
import io
from django.db import transaction
from django.utils import timezone
from rest_framework import status, generics, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .authentication import get_tokens_for_user
from .models import (
    User, StudentProfile, WardenAssignment,
    AuthorizedStudent, AuthorizedWarden, AuthorizedIdentity, EmailVerificationChallenge,
)
from .serializers import (
    LoginSerializer,
    UserSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    StudentSignupRequestOtpSerializer,
    StudentSignupVerifyOtpSerializer,
    StudentSignupCompleteSerializer,
    WardenSignupRequestOtpSerializer,
    WardenSignupVerifyOtpSerializer,
    WardenSignupCompleteSerializer,
    PasswordResetOtpRequestSerializer,
    PasswordResetOtpVerifySerializer,
    PasswordResetOtpCompleteSerializer,
    AuthorizedStudentSerializer,
    AuthorizedWardenSerializer,
)
from .otp import (
    create_otp_challenge,
    verify_otp_challenge,
    consume_verification_token,
)
from apps.accounts.permissions import IsHostelAdmin
from apps.audit.services import log_audit_event
from drf_spectacular.utils import extend_schema, OpenApiTypes

User = get_user_model()


def mask_email(email: str) -> str:
    """Mask email for privacy in public API responses (e.g. ar***@hostel.edu)."""
    parts = email.split('@')
    if len(parts) != 2:
        return '***'
    user_part, domain = parts
    if len(user_part) <= 2:
        masked_user = user_part[0] + '***'
    else:
        masked_user = user_part[:2] + '***' + user_part[-1]
    return f"{masked_user}@{domain}"


# ============================================================================
# LOGIN / LOGOUT / ME
# ============================================================================

@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Authenticate user via 8-digit Student Registration Number or Warden ID and password.
    Returns JWT tokens and user details.
    """
    serializer = LoginSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)

    user = serializer.validated_data['user']

    # Update last login timestamp
    user.last_login_at = timezone.now()
    user.save(update_fields=['last_login_at'])

    refresh = get_tokens_for_user(user)

    log_audit_event(
        user=user,
        action='LOGIN',
        description=f'User {user.email} logged in',
        request=request,
    )

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    }, status=status.HTTP_200_OK)


@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Blacklist the refresh token to log out."""
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except Exception:
        pass

    return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)


@extend_schema(responses={200: OpenApiTypes.OBJECT})
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Return the current authenticated user's profile."""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """Change the authenticated user's password."""
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)

    request.user.set_password(serializer.validated_data['new_password'])
    request.user.session_version += 1
    request.user.save(update_fields=['password', 'session_version'])

    log_audit_event(
        user=request.user,
        action='PASSWORD_CHANGE',
        description='Password changed',
        request=request,
    )

    return Response({'detail': 'Password changed successfully.'}, status=status.HTTP_200_OK)


# ============================================================================
# STUDENT REGISTRATION (OTP + 12-CHAR PASSWORD)
# ============================================================================

@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([AllowAny])
def student_signup_request_otp_view(request):
    """
    Step 1 & 2 of Student Registration:
    Validates Registration Number, institution-approved email, and gender against
    the authorized student roster, then sends a 6-digit OTP to the approved email.
    """
    serializer = StudentSignupRequestOtpSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    auth_student = serializer.validated_data['authorized_student']
    reg_no = auth_student.registration_number
    email = auth_student.email
    gender = serializer.validated_data['gender']

    challenge = create_otp_challenge(
        identifier=reg_no,
        purpose=EmailVerificationChallenge.Purpose.STUDENT_REGISTRATION,
        email=email,
        payload={
            'reg_no': reg_no,
            'email': email,
            'gender': gender,
            'approved_eligibility': auth_student.approved_eligibility,
        },
    )

    return Response({
        'detail': f'Verification OTP sent to your university email ({mask_email(email)}).',
        'registration_number': reg_no,
        'email_hint': mask_email(email),
        'expires_in_seconds': 300,
        'cooldown_seconds': 60,
    }, status=status.HTTP_200_OK)


@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([AllowAny])
def student_signup_verify_otp_view(request):
    """
    Step 3 of Student Registration:
    Verifies the 6-digit OTP and returns a single-use verification token.
    """
    serializer = StudentSignupVerifyOtpSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    reg_no = serializer.validated_data['registration_number'].strip().upper()
    entered_otp = serializer.validated_data['otp']

    verification_token = verify_otp_challenge(
        identifier=reg_no,
        purpose=EmailVerificationChallenge.Purpose.STUDENT_REGISTRATION,
        entered_otp=entered_otp,
    )

    return Response({
        'detail': 'Email verification successful. You may now create your password.',
        'registration_number': reg_no,
        'verification_token': verification_token,
    }, status=status.HTTP_200_OK)


@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([AllowAny])
def student_signup_complete_view(request):
    """
    Step 4 of Student Registration:
    Validates the single-use token, requires at least 12-char password,
    creates the user account with Role.STUDENT (server-enforced),
    and logs the student in.
    """
    serializer = StudentSignupCompleteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    reg_no = serializer.validated_data['registration_number'].strip().upper()
    token = serializer.validated_data['verification_token']
    password = serializer.validated_data['password']

    # Validate and consume token
    challenge = consume_verification_token(
        identifier=reg_no,
        purpose=EmailVerificationChallenge.Purpose.STUDENT_REGISTRATION,
        token=token,
    )

    # Fetch authorized student record
    try:
        auth_student = AuthorizedStudent.objects.get(
            registration_number__iexact=reg_no,
            authorization_status=AuthorizedStudent.Status.ACTIVE,
        )
    except AuthorizedStudent.DoesNotExist:
        return Response(
            {'detail': 'Student authorization record not found or suspended.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if auth_student.is_registered:
        return Response(
            {'detail': 'Student account is already registered. Please login.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        # Derive name parts
        names = (auth_student.full_name or 'Student').split()
        first_name = names[0] if names else 'Student'
        last_name = " ".join(names[1:]) if len(names) > 1 else ''

        # Server strictly enforces Role.STUDENT — client can never choose or elevate role
        user = User.objects.create_user(
            email=auth_student.email.lower(),
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=User.Role.STUDENT,
            registration_number=auth_student.registration_number,
            eligibility_classification=auth_student.approved_eligibility,
            is_email_verified=True,
            last_login_at=timezone.now(),
        )

        profile = StudentProfile.objects.create(
            user=user,
            roll_number=auth_student.registration_number,
            department=auth_student.department,
            year_of_study=auth_student.year_of_study,
            gender=auth_student.gender,
            fee_cleared=True,
            disciplinary_hold=False,
        )

        # Pre-allocate bed if assigned in authorized roster
        if auth_student.initial_hostel_code and auth_student.initial_room and auth_student.initial_bed:
            from apps.hostels.models import Bed, Allocation
            bed = Bed.objects.filter(
                room__block__hostel__code__iexact=auth_student.initial_hostel_code,
                room__room_number__iexact=auth_student.initial_room,
                bed_number__iexact=auth_student.initial_bed,
                is_active=True,
            ).first()
            if bed and not Allocation.objects.filter(bed=bed, is_active=True).exists():
                Allocation.objects.create(
                    student=user,
                    bed=bed,
                    is_active=True,
                    reason='Initial authorized roster allocation',
                )

        # Mark roster entry as registered
        auth_student.is_registered = True
        auth_student.save(update_fields=['is_registered', 'updated_at'])

        log_audit_event(
            user=user,
            action='ACCOUNT_CREATED',
            description=f'Student account created for {user.email} (Reg: {user.registration_number})',
            request=request,
        )

    # Issue JWT tokens with embedded session_version and role claims
    refresh = get_tokens_for_user(user)

    return Response({
        'detail': 'Student registration completed successfully.',
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    }, status=status.HTTP_201_CREATED)


# ============================================================================
# WARDEN REGISTRATION (DEDICATED FLOW + ASSIGNED HOSTEL SCOPE)
# ============================================================================

@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([AllowAny])
def warden_signup_request_otp_view(request):
    """
    Step 1 & 2 of Warden Registration:
    Verifies Warden ID and official email against AuthorizedWarden roster,
    then dispatches 6-digit OTP to the pre-authorized email.
    """
    serializer = WardenSignupRequestOtpSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    auth_warden = serializer.validated_data['authorized_warden']
    warden_id = auth_warden.warden_id
    email = auth_warden.email

    create_otp_challenge(
        identifier=warden_id,
        purpose=EmailVerificationChallenge.Purpose.WARDEN_REGISTRATION,
        email=email,
        payload={'warden_id': warden_id, 'email': email},
    )

    return Response({
        'detail': f'Verification OTP sent to authorized institutional email ({mask_email(email)}).',
        'warden_id': warden_id,
        'email_hint': mask_email(email),
        'expires_in_seconds': 300,
        'cooldown_seconds': 60,
    }, status=status.HTTP_200_OK)


@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([AllowAny])
def warden_signup_verify_otp_view(request):
    """
    Step 3 of Warden Registration:
    Verifies 6-digit OTP for pre-authorized Warden.
    """
    serializer = WardenSignupVerifyOtpSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    warden_id = serializer.validated_data['warden_id'].strip().upper()
    entered_otp = serializer.validated_data['otp']

    verification_token = verify_otp_challenge(
        identifier=warden_id,
        purpose=EmailVerificationChallenge.Purpose.WARDEN_REGISTRATION,
        entered_otp=entered_otp,
    )

    return Response({
        'detail': 'OTP verified successfully. You may now create your secure password.',
        'warden_id': warden_id,
        'verification_token': verification_token,
    }, status=status.HTTP_200_OK)


@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([AllowAny])
def warden_signup_complete_view(request):
    """
    Step 4 of Warden Registration:
    Validates token, requires at least 12-character password,
    creates account with role from AuthorizedWarden (WARDEN or CHIEF_WARDEN),
    links authorized hostel scope, and logs warden in.
    """
    serializer = WardenSignupCompleteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    warden_id = serializer.validated_data['warden_id'].strip().upper()
    token = serializer.validated_data['verification_token']
    password = serializer.validated_data['password']

    challenge = consume_verification_token(
        identifier=warden_id,
        purpose=EmailVerificationChallenge.Purpose.WARDEN_REGISTRATION,
        token=token,
    )

    try:
        auth_warden = AuthorizedWarden.objects.get(
            warden_id__iexact=warden_id,
            authorization_status=AuthorizedWarden.Status.ACTIVE,
        )
    except AuthorizedWarden.DoesNotExist:
        return Response(
            {'detail': 'Warden authorization record not found or revoked.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if auth_warden.is_registered:
        return Response(
            {'detail': 'Warden account is already registered. Please login.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        names = (auth_warden.full_name or 'Warden').split()
        first_name = names[0] if names else 'Warden'
        last_name = " ".join(names[1:]) if len(names) > 1 else ''

        # Server grants only pre-authorized role (WARDEN or CHIEF_WARDEN)
        user = User.objects.create_user(
            email=auth_warden.email.lower(),
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone=auth_warden.phone,
            role=auth_warden.role,
            warden_id=auth_warden.warden_id,
            is_email_verified=True,
            last_login_at=timezone.now(),
        )

        # Assign pre-authorized hostels
        for hostel in auth_warden.assigned_hostels.all():
            WardenAssignment.objects.create(
                warden=user,
                hostel=hostel,
                is_active=True,
            )

        auth_warden.is_registered = True
        auth_warden.save(update_fields=['is_registered', 'updated_at'])

        log_audit_event(
            user=user,
            action='ACCOUNT_CREATED',
            description=f'Warden account created for {user.email} (ID: {user.warden_id}, Role: {user.role})',
            request=request,
        )

    refresh = get_tokens_for_user(user)

    return Response({
        'detail': 'Warden registration completed successfully.',
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
        'redirect_url': '/warden',
    }, status=status.HTTP_201_CREATED)


# ============================================================================
# PASSWORD RESET VIA 6-DIGIT OTP
# ============================================================================

@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_otp_request_view(request):
    """
    Request a 6-digit OTP for password reset.
    Accepts student registration number, warden ID, or email address.
    """
    serializer = PasswordResetOtpRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    identifier = serializer.validated_data['identifier'].strip()
    user = None

    if '@' in identifier:
        user = User.objects.filter(email__iexact=identifier).first()
    else:
        # Match student registration number or warden id
        user = User.objects.filter(registration_number__iexact=identifier).first() or \
               User.objects.filter(warden_id__iexact=identifier).first()

        if not user:
            # Check student profile
            prof = StudentProfile.objects.filter(roll_number__iexact=identifier).first()
            if prof:
                user = prof.user

    if user and user.is_active:
        create_otp_challenge(
            identifier=identifier,
            purpose=EmailVerificationChallenge.Purpose.PASSWORD_RESET,
            email=user.email,
            payload={'user_id': user.id, 'email': user.email},
        )
        email_hint = mask_email(user.email)
    else:
        email_hint = 'your registered institutional email'

    return Response({
        'detail': f'If a matching active account was found, a 6-digit verification code has been sent to {email_hint}.',
        'identifier': identifier,
        'expires_in_seconds': 300,
    }, status=status.HTTP_200_OK)


@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_otp_verify_view(request):
    """Verify 6-digit OTP for password reset and receive single-use token."""
    serializer = PasswordResetOtpVerifySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    identifier = serializer.validated_data['identifier'].strip()
    entered_otp = serializer.validated_data['otp']

    token = verify_otp_challenge(
        identifier=identifier,
        purpose=EmailVerificationChallenge.Purpose.PASSWORD_RESET,
        entered_otp=entered_otp,
    )

    return Response({
        'detail': 'Code verified successfully. You may now enter your new password.',
        'identifier': identifier,
        'verification_token': token,
    }, status=status.HTTP_200_OK)


@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_otp_complete_view(request):
    """
    Complete password reset with validated token.
    Enforces min 12 characters. Never modifies role or assigned hostel permissions.
    """
    serializer = PasswordResetOtpCompleteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    identifier = serializer.validated_data['identifier'].strip()
    token = serializer.validated_data['verification_token']
    new_password = serializer.validated_data['new_password']

    challenge = consume_verification_token(
        identifier=identifier,
        purpose=EmailVerificationChallenge.Purpose.PASSWORD_RESET,
        token=token,
    )

    user_id = challenge.payload.get('user_id')
    user = None
    if user_id:
        user = User.objects.filter(id=user_id).first()

    if not user:
        if '@' in identifier:
            user = User.objects.filter(email__iexact=identifier).first()
        else:
            user = User.objects.filter(registration_number__iexact=identifier).first() or \
                   User.objects.filter(warden_id__iexact=identifier).first()

    if not user:
        return Response({'detail': 'User account not found.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.session_version += 1
    user.save(update_fields=['password', 'session_version'])

    log_audit_event(
        user=user,
        action='PASSWORD_RESET',
        description=f'Password reset completed via OTP for {user.email}',
        request=request,
    )

    return Response({
        'detail': 'Your password has been reset successfully. You may now log in.',
    }, status=status.HTTP_200_OK)


# ============================================================================
# LEGACY PASSWORD RESET (Link Based)
# ============================================================================

@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request_view(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data['email']
    try:
        user = User.objects.get(email=email, is_active=True)
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"
        from django.core.mail import send_mail
        send_mail(
            subject='Password Reset - Hostel Room Exchange',
            message=f'Click the link to reset your password: {reset_url}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True,
        )
    except User.DoesNotExist:
        pass
    return Response({
        'detail': 'If an account with that email exists, a reset link has been sent.'
    }, status=status.HTTP_200_OK)


@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        uid = force_str(urlsafe_base64_decode(serializer.validated_data['uid']))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({'detail': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, serializer.validated_data['token']):
        return Response({'detail': 'Invalid or expired reset link.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(serializer.validated_data['new_password'])
    user.save()
    return Response({'detail': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)


# ============================================================================
# ADMIN ROSTER MANAGEMENT VIEWSETS
# ============================================================================

class AuthorizedStudentViewSet(viewsets.ModelViewSet):
    """
    Hostel Administrator management of Authorized Student Roster.
    Supports manual addition, CSV bulk upload, and status/eligibility updates.
    """
    queryset = AuthorizedStudent.objects.all().order_by('-created_at')
    serializer_class = AuthorizedStudentSerializer
    permission_classes = [IsHostelAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['authorization_status', 'approved_eligibility', 'gender', 'is_registered']
    search_fields = ['registration_number', 'email', 'full_name', 'department']
    ordering_fields = ['registration_number', 'created_at', 'full_name']

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        # Sync with AuthorizedIdentity so the student can verify OTP & activate immediately
        AuthorizedIdentity.objects.update_or_create(
            institution_id=instance.registration_number,
            defaults={
                'name': instance.full_name or f"Student {instance.registration_number}",
                'trusted_email': instance.email,
                'role': User.Role.STUDENT,
                'gender': instance.gender,
                'eligibility_classification': instance.approved_eligibility,
                'department': instance.department,
                'year_of_study': instance.year_of_study,
                'initial_hostel_code': instance.initial_hostel_code,
                'initial_room': instance.initial_room,
                'initial_bed': instance.initial_bed,
                'authorization_status': instance.authorization_status,
                'activation_status': AuthorizedIdentity.ActivationStatus.PENDING_ACTIVATION,
                'created_by': self.request.user,
            }
        )
        log_audit_event(
            user=self.request.user,
            action='ROSTER_STUDENT_ADDED',
            description=f'Student {instance.registration_number} authorized by {self.request.user.email}',
            target_type='AuthorizedStudent',
            target_id=instance.id,
            request=self.request,
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        AuthorizedIdentity.objects.filter(institution_id__iexact=instance.registration_number).update(
            trusted_email=instance.email,
            name=instance.full_name,
            gender=instance.gender,
            eligibility_classification=instance.approved_eligibility,
            department=instance.department,
            year_of_study=instance.year_of_study,
            authorization_status=instance.authorization_status,
        )
        log_audit_event(
            user=self.request.user,
            action='ROSTER_STUDENT_UPDATED',
            description=f'Authorized student {instance.registration_number} updated (Eligibility: {instance.approved_eligibility}, Status: {instance.authorization_status})',
            target_type='AuthorizedStudent',
            target_id=instance.id,
            request=self.request,
        )

    def perform_destroy(self, instance):
        reg_no = instance.registration_number
        email = instance.email
        # Delete associated student user if any
        user = User.objects.filter(registration_number__iexact=reg_no).first() or \
               User.objects.filter(email__iexact=email).first()
        if user:
            user.delete()
        # Delete associated AuthorizedIdentity
        AuthorizedIdentity.objects.filter(institution_id__iexact=reg_no).delete()
        instance.delete()
        log_audit_event(
            user=self.request.user,
            action='ROSTER_STUDENT_DELETED',
            description=f'Student {reg_no} ({email}) removed by {self.request.user.email}',
            request=self.request,
        )

    @action(detail=False, methods=['post'], url_path='import')
    def import_csv(self, request):
        """
        Bulk import authorized students from CSV file or raw CSV text.
        Columns expected:
        registration_number, email, full_name, gender, approved_eligibility, department, year_of_study, initial_hostel_code, initial_room, initial_bed
        """
        csv_file = request.FILES.get('file')
        raw_text = request.data.get('csv_text')

        if csv_file:
            decoded = csv_file.read().decode('utf-8-sig')
        elif raw_text:
            decoded = raw_text
        else:
            return Response({'detail': 'No CSV file or csv_text provided.'}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(io.StringIO(decoded))
        created_count = 0
        updated_count = 0
        errors = []

        for row_idx, row in enumerate(reader, start=1):
            reg_no = (row.get('registration_number') or row.get('reg_no') or '').strip().upper()
            email = (row.get('email') or '').strip().lower()
            if not reg_no or not email:
                errors.append(f"Row {row_idx}: Missing registration_number or email.")
                continue

            full_name = (row.get('full_name') or row.get('name') or '').strip()
            gender = (row.get('gender') or 'MALE').strip().upper()
            eligibility = (row.get('approved_eligibility') or ('BOYS' if gender == 'MALE' else 'GIRLS')).strip().upper()
            dept = (row.get('department') or '').strip()
            try:
                year = int(row.get('year_of_study') or 1)
            except ValueError:
                year = 1

            hostel_code = (row.get('initial_hostel_code') or '').strip().upper()
            room_no = (row.get('initial_room') or '').strip()
            bed_no = (row.get('initial_bed') or '').strip().upper()

            obj, created = AuthorizedStudent.objects.update_or_create(
                registration_number=reg_no,
                defaults={
                    'email': email,
                    'full_name': full_name,
                    'gender': gender,
                    'approved_eligibility': eligibility,
                    'department': dept,
                    'year_of_study': year,
                    'initial_hostel_code': hostel_code,
                    'initial_room': room_no,
                    'initial_bed': bed_no,
                    'authorization_status': AuthorizedStudent.Status.ACTIVE,
                    'created_by': request.user,
                }
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        log_audit_event(
            user=request.user,
            action='ROSTER_STUDENTS_IMPORTED',
            description=f'Imported {created_count} new, {updated_count} updated students via CSV',
            request=request,
        )

        return Response({
            'detail': f'CSV Import completed: {created_count} added, {updated_count} updated.',
            'created_count': created_count,
            'updated_count': updated_count,
            'errors': errors,
        }, status=status.HTTP_200_OK)


class AuthorizedWardenViewSet(viewsets.ModelViewSet):
    """
    Hostel Administrator management of Authorized Warden Roster and assigned hostel scopes.
    """
    queryset = AuthorizedWarden.objects.prefetch_related('assigned_hostels').all().order_by('-created_at')
    serializer_class = AuthorizedWardenSerializer
    permission_classes = [IsHostelAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['authorization_status', 'role', 'is_registered']
    search_fields = ['warden_id', 'email', 'full_name']
    ordering_fields = ['warden_id', 'created_at']

    def perform_create(self, serializer):
        instance = serializer.save(approved_by=self.request.user)
        # Sync with AuthorizedIdentity so the warden can verify OTP & activate immediately
        hostel_codes = list(instance.assigned_hostels.values_list('code', flat=True))
        AuthorizedIdentity.objects.update_or_create(
            institution_id=instance.warden_id,
            defaults={
                'name': instance.full_name or f"Warden {instance.warden_id}",
                'trusted_email': instance.email,
                'role': instance.role,
                'assigned_hostel_ids': hostel_codes,
                'authorization_status': instance.authorization_status,
                'activation_status': AuthorizedIdentity.ActivationStatus.PENDING_ACTIVATION,
                'created_by': self.request.user,
            }
        )
        log_audit_event(
            user=self.request.user,
            action='ROSTER_WARDEN_AUTHORIZED',
            description=f'Warden {instance.warden_id} ({instance.email}) authorized by {self.request.user.email}',
            target_type='AuthorizedWarden',
            target_id=instance.id,
            request=self.request,
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        hostel_codes = list(instance.assigned_hostels.values_list('code', flat=True))
        AuthorizedIdentity.objects.filter(institution_id__iexact=instance.warden_id).update(
            trusted_email=instance.email,
            name=instance.full_name,
            role=instance.role,
            assigned_hostel_ids=hostel_codes,
            authorization_status=instance.authorization_status,
        )
        log_audit_event(
            user=self.request.user,
            action='ROSTER_WARDEN_UPDATED',
            description=f'Authorized warden {instance.warden_id} updated (Role: {instance.role}, Status: {instance.authorization_status})',
            target_type='AuthorizedWarden',
            target_id=instance.id,
            request=self.request,
        )

    def perform_destroy(self, instance):
        warden_id = instance.warden_id
        email = instance.email
        # Delete associated warden user and assignments if any
        user = User.objects.filter(warden_id__iexact=warden_id).first() or \
               User.objects.filter(email__iexact=email).first()
        if user:
            WardenAssignment.objects.filter(warden=user).delete()
            user.delete()
        # Delete associated AuthorizedIdentity
        AuthorizedIdentity.objects.filter(institution_id__iexact=warden_id).delete()
        instance.delete()
        log_audit_event(
            user=self.request.user,
            action='ROSTER_WARDEN_DELETED',
            description=f'Warden {warden_id} ({email}) removed by {self.request.user.email}',
            request=self.request,
        )

    @action(detail=False, methods=['post'], url_path='import')
    def import_csv(self, request):
        """
        Bulk import authorized wardens from CSV.
        Columns: warden_id, email, full_name, role, phone, hostel_codes (comma-separated, e.g. "BH1,BH2")
        """
        csv_file = request.FILES.get('file')
        raw_text = request.data.get('csv_text')

        if csv_file:
            decoded = csv_file.read().decode('utf-8-sig')
        elif raw_text:
            decoded = raw_text
        else:
            return Response({'detail': 'No CSV file or csv_text provided.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.hostels.models import Hostel

        reader = csv.DictReader(io.StringIO(decoded))
        created_count = 0
        updated_count = 0
        errors = []

        for row_idx, row in enumerate(reader, start=1):
            w_id = (row.get('warden_id') or '').strip().upper()
            email = (row.get('email') or '').strip().lower()
            if not w_id or not email:
                errors.append(f"Row {row_idx}: Missing warden_id or email.")
                continue

            full_name = (row.get('full_name') or '').strip()
            role = (row.get('role') or 'WARDEN').strip().upper()
            phone = (row.get('phone') or '').strip()
            hostel_codes_str = row.get('hostel_codes') or row.get('hostels') or ''

            obj, created = AuthorizedWarden.objects.update_or_create(
                warden_id=w_id,
                defaults={
                    'email': email,
                    'full_name': full_name,
                    'role': role if role in ('WARDEN', 'CHIEF_WARDEN') else 'WARDEN',
                    'phone': phone,
                    'authorization_status': AuthorizedWarden.Status.ACTIVE,
                    'approved_by': request.user,
                }
            )

            # Assign hostels
            if hostel_codes_str:
                codes = [c.strip().upper() for c in hostel_codes_str.split(',') if c.strip()]
                matched_hostels = Hostel.objects.filter(code__in=codes)
                obj.assigned_hostels.set(matched_hostels)

            if created:
                created_count += 1
            else:
                updated_count += 1

        log_audit_event(
            user=request.user,
            action='ROSTER_WARDENS_IMPORTED',
            description=f'Imported {created_count} new, {updated_count} updated wardens via CSV',
            request=request,
        )

        return Response({
            'detail': f'CSV Import completed: {created_count} added, {updated_count} updated.',
            'created_count': created_count,
            'updated_count': updated_count,
            'errors': errors,
        }, status=status.HTTP_200_OK)
