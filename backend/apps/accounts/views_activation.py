"""
Module: backend/apps/accounts/views_activation.py

Work / Purpose:
    Implements public OTP-based account activation workflow views (request OTP, verify OTP, set initial password) for pre-authorized users.

Connected Modules (Used By / Routes):
    - backend/apps/accounts/urls.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/models.py
    - backend/apps/accounts/otp.py
    - backend/apps/accounts/serializers.py
    - backend/apps/audit/services.py
    - backend/apps/hostels/models.py
    - django (external library / framework)
    - rest_framework (external library / framework)

Original Module Notes:
    Public OTP-Based Account Activation Workflow Views.
    No public self-signup without prior Super Admin authorization.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from django.contrib.auth import get_user_model

from .models import AuthorizedIdentity, StudentProfile, WardenAssignment, OTPChallenge
from .serializers import (
    ActivationRequestOtpSerializer,
    ActivationVerifyOtpSerializer,
    ActivationSetPasswordSerializer,
    mask_email,
)
from .otp import (
    create_identity_otp_challenge,
    verify_identity_otp,
    consume_identity_activation_grant,
)
from apps.audit.services import log_audit_event
from apps.hostels.models import Hostel
from drf_spectacular.utils import extend_schema, OpenApiTypes

User = get_user_model()


@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([AllowAny])
def request_activation_otp_view(request):
    """
    Step 1 & 2: User enters Institutional ID and registered Email.
    Backend validates identity, updates destination email, and dispatches real OTP via Gmail SMTP.
    """
    serializer = ActivationRequestOtpSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    institution_id = serializer.validated_data['institution_id'].strip().upper()
    email = serializer.validated_data['email'].strip().lower()

    # 1. Lookup AuthorizedIdentity by institution_id or trusted_email
    identity = (
        AuthorizedIdentity.objects.filter(institution_id__iexact=institution_id).first() or
        AuthorizedIdentity.objects.filter(trusted_email__iexact=email).first()
    )

    if not identity:
        # Cross-check AuthorizedStudent roster
        from .models import AuthorizedStudent
        auth_student = (
            AuthorizedStudent.objects.filter(registration_number__iexact=institution_id).first() or
            AuthorizedStudent.objects.filter(email__iexact=email).first()
        )
        if auth_student:
            identity, _ = AuthorizedIdentity.objects.get_or_create(
                institution_id=auth_student.registration_number,
                defaults={
                    'name': auth_student.full_name or f"Student {auth_student.registration_number}",
                    'trusted_email': auth_student.email.lower(),
                    'role': User.Role.STUDENT,
                    'gender': auth_student.gender,
                    'eligibility_classification': auth_student.approved_eligibility,
                    'department': auth_student.department,
                    'year_of_study': auth_student.year_of_study,
                    'initial_hostel_code': auth_student.initial_hostel_code,
                    'initial_room': auth_student.initial_room,
                    'initial_bed': auth_student.initial_bed,
                    'authorization_status': auth_student.authorization_status,
                    'activation_status': AuthorizedIdentity.ActivationStatus.PENDING_ACTIVATION,
                }
            )

    if identity:
        # Security: The provided email MUST match the identity's trusted institutional email
        # To prevent account hijacking, never allow arbitrary re-binding of trusted_email via public endpoints!
        if identity.trusted_email.strip().lower() != email:
            return Response({
                'detail': 'If an authorized identity or active account matches these credentials, a one-time password has been dispatched.',
                'identifier': institution_id,
            }, status=status.HTTP_200_OK)

        if identity.authorization_status in ('SUSPENDED', 'REVOKED'):
            if identity.authorization_status == AuthorizedIdentity.AuthorizationStatus.SUSPENDED:
                return Response({'detail': 'This account has been suspended by administration.'}, status=status.HTTP_403_FORBIDDEN)
            if identity.authorization_status == AuthorizedIdentity.AuthorizationStatus.REVOKED:
                return Response({'detail': 'This account authorization has been revoked.'}, status=status.HTTP_403_FORBIDDEN)
    else:
        # Check if an existing User matches
        matched_user = (
            User.objects.filter(registration_number__iexact=institution_id).first() or
            User.objects.filter(email__iexact=email).first() or
            User.objects.filter(warden_id__iexact=institution_id).first()
        )
        if matched_user:
            # Both email and institution_id must match the matched user's registered credentials
            user_reg = (matched_user.registration_number or matched_user.warden_id or '').strip().upper()
            if matched_user.email.strip().lower() != email or (user_reg and user_reg != institution_id):
                return Response({
                    'detail': 'If an authorized identity or active account matches these credentials, a one-time password has been dispatched.',
                    'identifier': institution_id,
                }, status=status.HTTP_200_OK)

            identity, _ = AuthorizedIdentity.objects.get_or_create(
                institution_id=user_reg or institution_id,
                defaults={
                    'name': matched_user.get_full_name() or f"User {institution_id}",
                    'trusted_email': matched_user.email.lower(),
                    'role': matched_user.role,
                    'authorization_status': AuthorizedIdentity.AuthorizationStatus.ACTIVE,
                    'activation_status': AuthorizedIdentity.ActivationStatus.PENDING_ACTIVATION,
                }
            )
        else:
            return Response({
                'detail': 'If an authorized identity or active account matches these credentials, a one-time password has been dispatched.',
                'identifier': institution_id,
            }, status=status.HTTP_200_OK)

    # Issue challenge & deliver email asynchronously via real SMTP
    try:
        challenge = create_identity_otp_challenge(
            identity=identity,
            purpose=OTPChallenge.Purpose.ACTIVATION,
            request=request,
            target_email=email,
        )
    except Exception as e:
        detail_msg = getattr(e, 'detail', str(e))
        if isinstance(detail_msg, dict):
            detail_msg = detail_msg.get('detail', str(detail_msg))
        return Response({'detail': detail_msg}, status=status.HTTP_400_BAD_REQUEST)

    resp_data = {
        'detail': f"A 6-digit verification code has been sent to {email}. Please check your email inbox (and Spam folder).",
        'email': email,
        'masked_email': mask_email(email),
        'identifier': identity.institution_id,
        'role': identity.role,
    }

    return Response(resp_data, status=status.HTTP_200_OK)


@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_activation_otp_view(request):
    """
    Step 3: User submits the 6-digit OTP received in email.
    Verifies hash, enforces rate-limiting and single-use challenge consumption.
    Returns opaque verification grant token.
    """
    serializer = ActivationVerifyOtpSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    identifier = serializer.validated_data['identifier']
    otp = serializer.validated_data['otp']

    try:
        verification_token = verify_identity_otp(
            identifier=identifier,
            entered_otp=otp,
            purpose=OTPChallenge.Purpose.ACTIVATION,
            request=request,
        )
    except Exception as e:
        detail_msg = getattr(e, 'detail', str(e))
        if isinstance(detail_msg, dict):
            detail_msg = detail_msg.get('detail', str(detail_msg))
        return Response({'detail': detail_msg}, status=status.HTTP_400_BAD_REQUEST)

    # Immediately mark AuthorizedStudent and AuthorizedWarden as registered upon OTP verification
    from .models import AuthorizedStudent, AuthorizedWarden
    from django.db.models import Q
    clean_id = identifier.strip()
    now_ts = timezone.now()
    AuthorizedStudent.objects.filter(
        Q(registration_number__iexact=clean_id) |
        Q(email__iexact=clean_id)
    ).update(is_registered=True, updated_at=now_ts)

    AuthorizedWarden.objects.filter(
        Q(warden_id__iexact=clean_id) |
        Q(email__iexact=clean_id)
    ).update(is_registered=True, updated_at=now_ts)

    return Response({
        'detail': 'OTP successfully verified. Please set your private personal password.',
        'verification_token': verification_token,
    }, status=status.HTTP_200_OK)


@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@api_view(['POST'])
@permission_classes([AllowAny])
def set_activation_password_view(request):
    """
    Step 4 & 5: Set private personal password, consume activation grant,
    and activate user account without unique constraint failures.
    """
    serializer = ActivationSetPasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    identifier = serializer.validated_data['identifier']
    token = serializer.validated_data['verification_token']
    password = serializer.validated_data['password']

    try:
        challenge = consume_identity_activation_grant(
            identifier=identifier,
            token=token,
            purpose=OTPChallenge.Purpose.ACTIVATION,
        )
    except Exception as e:
        detail_msg = getattr(e, 'detail', str(e))
        if isinstance(detail_msg, dict):
            detail_msg = detail_msg.get('detail', str(detail_msg))
        return Response({'detail': detail_msg}, status=status.HTTP_400_BAD_REQUEST)

    identity = challenge.authorized_identity
    if not identity:
        identity = AuthorizedIdentity.objects.filter(institution_id__iexact=identifier).first() or \
                   AuthorizedIdentity.objects.filter(trusted_email__iexact=identifier).first()

    if not identity:
        return Response({'detail': 'Authorized identity record not found.'}, status=status.HTTP_404_NOT_FOUND)

    now = timezone.now()

    with transaction.atomic():
        identity = AuthorizedIdentity.objects.select_for_update().get(pk=identity.pk)

        # 1. Resolve or prepare User
        user = User.objects.filter(email__iexact=identity.trusted_email).first()
        if not user:
            user = User.objects.filter(registration_number__iexact=identity.institution_id).first()
        if not user and identity.user_accounts.exists():
            user = identity.user_accounts.first()

        name_parts = identity.name.strip().split()
        first_name = name_parts[0] if name_parts else 'User'
        last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''

        if user:
            # If another user holds this registration number, re-label it to avoid unique collision
            other_user = User.objects.filter(
                registration_number__iexact=identity.institution_id
            ).exclude(pk=user.pk).first()
            if other_user:
                other_user.registration_number = f"{identity.institution_id}_archived_{other_user.pk}"
                other_user.save(update_fields=['registration_number'])

            user.email = identity.trusted_email.lower()
            user.role = identity.role
            user.first_name = first_name
            user.last_name = last_name
            user.registration_number = identity.institution_id
            if identity.role in (User.Role.WARDEN, User.Role.CHIEF_WARDEN):
                user.warden_id = identity.institution_id
            if identity.role == User.Role.SUPER_ADMIN:
                user.is_staff = True
                user.is_superuser = True
            elif identity.role == User.Role.HOSTEL_ADMIN:
                user.is_staff = True
            user.account_status = 'ACTIVE'
            user.is_active = True
            user.is_email_verified = True
            user.authorized_identity = identity
            user.permissions_list = identity.permissions or ['*']
            user.session_version += 1
            user.set_password(password)
            user.save()
        else:
            # Archive any placeholder user holding this institution_id before creating
            other_user = User.objects.filter(
                registration_number__iexact=identity.institution_id
            ).first()
            if other_user:
                other_user.registration_number = f"{identity.institution_id}_archived_{other_user.pk}"
                other_user.save(update_fields=['registration_number'])

            user = User.objects.create(
                email=identity.trusted_email.lower(),
                role=identity.role,
                first_name=first_name,
                last_name=last_name,
                registration_number=identity.institution_id,
                warden_id=identity.institution_id if identity.role in ('WARDEN', 'CHIEF_WARDEN') else '',
                eligibility_classification=identity.eligibility_classification,
                account_status='ACTIVE',
                is_active=True,
                is_email_verified=True,
                is_staff=(identity.role in (User.Role.HOSTEL_ADMIN, User.Role.SUPER_ADMIN)),
                is_superuser=(identity.role == User.Role.SUPER_ADMIN),
                authorized_identity=identity,
                permissions_list=identity.permissions or ['*'],
            )
            user.set_password(password)
            user.save()

        # 2. Role-specific setup (Student Profile) without UNIQUE constraint collision
        if identity.role == User.Role.STUDENT:
            existing_profile_by_roll = StudentProfile.objects.filter(
                roll_number__iexact=identity.institution_id
            ).first()

            if existing_profile_by_roll:
                existing_profile_by_roll.user = user
                existing_profile_by_roll.department = identity.department or existing_profile_by_roll.department
                existing_profile_by_roll.year_of_study = identity.year_of_study or existing_profile_by_roll.year_of_study
                existing_profile_by_roll.gender = identity.gender or existing_profile_by_roll.gender
                existing_profile_by_roll.fee_cleared = True
                existing_profile_by_roll.disciplinary_hold = False
                existing_profile_by_roll.save()
            else:
                StudentProfile.objects.update_or_create(
                    user=user,
                    defaults={
                        'roll_number': identity.institution_id,
                        'department': identity.department,
                        'year_of_study': identity.year_of_study,
                        'gender': identity.gender,
                        'fee_cleared': True,
                        'disciplinary_hold': False,
                    }
                )

            # Auto-assign initial bed if specified in authorized identity
            if identity.initial_hostel_code and identity.initial_room and identity.initial_bed:
                from apps.hostels.models import Bed, Allocation
                bed = Bed.objects.filter(
                    room__block__hostel__code__iexact=identity.initial_hostel_code,
                    room__room_number__iexact=identity.initial_room,
                    bed_number__iexact=identity.initial_bed,
                    is_active=True,
                ).first()
                if bed and not Allocation.objects.filter(bed=bed, is_active=True).exists():
                    Allocation.objects.create(
                        student=user,
                        bed=bed,
                        is_active=True,
                        reason='Initial authorized roster allocation',
                    )

        elif identity.role in (User.Role.WARDEN, User.Role.CHIEF_WARDEN):
            # Assign hostels
            for hostel_id_or_code in identity.assigned_hostel_ids:
                hostel = None
                if str(hostel_id_or_code).isdigit():
                    hostel = Hostel.objects.filter(id=int(hostel_id_or_code)).first()
                if not hostel:
                    hostel = Hostel.objects.filter(code__iexact=str(hostel_id_or_code)).first()
                if hostel:
                    WardenAssignment.objects.get_or_create(
                        warden=user,
                        hostel=hostel,
                        defaults={'is_active': True}
                    )

        # Mark identity active
        identity.activation_status = AuthorizedIdentity.ActivationStatus.ACTIVE
        identity.authorization_status = AuthorizedIdentity.AuthorizationStatus.ACTIVE
        identity.activated_at = now
        identity.save(update_fields=['activation_status', 'authorization_status', 'activated_at', 'updated_at'])

        # Ensure pre-authorized rosters reflect registered status
        from .models import AuthorizedStudent, AuthorizedWarden
        from django.db.models import Q
        AuthorizedStudent.objects.filter(
            Q(registration_number__iexact=identity.institution_id) |
            Q(email__iexact=identity.trusted_email)
        ).update(is_registered=True, updated_at=now)

        AuthorizedWarden.objects.filter(
            Q(warden_id__iexact=identity.institution_id) |
            Q(email__iexact=identity.trusted_email)
        ).update(is_registered=True, updated_at=now)

        # Invalidate remaining challenges for this identity
        OTPChallenge.objects.filter(
            identifier=identity.institution_id.lower(),
            is_consumed=False,
        ).update(is_consumed=True, invalidated_at=now)

        log_audit_event(
            user=user,
            action='ACCOUNT_ACTIVATED',
            description=f"Account activated successfully for {identity.role} {identity.institution_id} ({identity.trusted_email})",
            request=request,
        )

    return Response({
        'detail': 'Account activated successfully. You can now sign in with your credentials.',
        'role': identity.role,
        'institution_id': identity.institution_id,
        'email': identity.trusted_email,
    }, status=status.HTTP_200_OK)
