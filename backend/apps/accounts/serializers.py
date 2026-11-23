"""
Module: backend/apps/accounts/serializers.py

Work / Purpose:
    Defines DRF serializers for login, user profiles, password changes/resets, OTP signup flows, warden assignments, and authorized identity/student/warden rosters.

Connected Modules (Used By / Routes):
    - backend/apps/accounts/views.py
    - backend/apps/accounts/views_activation.py
    - backend/apps/accounts/views_super_admin.py
    - backend/apps/audit/serializers.py
    - backend/apps/exchange_requests/serializers.py
    - backend/apps/hostels/serializers.py
    - backend/apps/proposals/serializers.py
    - backend/apps/transfers/serializers.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/models.py
    - django (external library / framework)
    - rest_framework (external library / framework)

Original Module Notes:
    Serializers for authentication and user management.
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import (
    User, StudentProfile, WardenAssignment,
    AuthorizedStudent, AuthorizedWarden, AuthorizedIdentity, OTPChallenge,
)


class LoginSerializer(serializers.Serializer):
    """Validates login credentials via Registration Number, Staff ID, or Email."""
    identifier = serializers.CharField(required=False, allow_blank=True)
    registration_number = serializers.CharField(required=False, allow_blank=True)
    email = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        from django.db import models
        raw_identifier = (data.get('identifier') or data.get('registration_number') or data.get('email') or '').strip()
        password = data.get('password', '').strip()

        if not raw_identifier:
            raise serializers.ValidationError('Registration number or email is required.')
        if not password:
            raise serializers.ValidationError('Password is required.')

        resolved_email = None

        # 1. Direct email match on User
        if '@' in raw_identifier:
            user_obj = User.objects.filter(email__iexact=raw_identifier).first()
            if user_obj:
                resolved_email = user_obj.email

        # 2. Match via AuthorizedIdentity institution_id or trusted_email (prioritize verified accounts)
        if not resolved_email:
            identity = AuthorizedIdentity.objects.filter(
                models.Q(institution_id__iexact=raw_identifier) |
                models.Q(trusted_email__iexact=raw_identifier)
            ).first()
            if identity:
                matched_user = User.objects.filter(email__iexact=identity.trusted_email).first() or \
                               User.objects.filter(authorized_identity=identity).first()
                if matched_user:
                    resolved_email = matched_user.email
                elif identity.activation_status in ('INVITED', 'PENDING_ACTIVATION'):
                    raise serializers.ValidationError(
                        'This account has not been activated yet. Please click "Activate Account" to verify OTP and set your password.'
                    )

        # 3. Match by User registration_number or warden_id directly
        if not resolved_email:
            matched_user = User.objects.filter(registration_number__iexact=raw_identifier).first() or \
                           User.objects.filter(warden_id__iexact=raw_identifier).first()
            if matched_user:
                resolved_email = matched_user.email

        # 4. Match by student roll_number in StudentProfile
        if not resolved_email:
            profile = StudentProfile.objects.filter(roll_number__iexact=raw_identifier).select_related('user').first()
            if profile and profile.user:
                resolved_email = profile.user.email

        # 5. Check AuthorizedStudent / AuthorizedWarden rosters
        if not resolved_email:
            from .models import AuthorizedStudent, AuthorizedWarden
            auth_st = AuthorizedStudent.objects.filter(registration_number__iexact=raw_identifier).first()
            if auth_st:
                user_by_st_email = User.objects.filter(email__iexact=auth_st.email).first()
                if user_by_st_email:
                    resolved_email = user_by_st_email.email

            if not resolved_email:
                auth_wd = AuthorizedWarden.objects.filter(warden_id__iexact=raw_identifier).first()
                if auth_wd:
                    user_by_wd_email = User.objects.filter(email__iexact=auth_wd.email).first()
                    if user_by_wd_email:
                        resolved_email = user_by_wd_email.email

        # 6. Known registration number aliases for demo personas
        if not resolved_email:
            reg_clean = raw_identifier.upper()
            student_mapping = {
                '12345678': 'student1@hostel.edu',
                '12101001': 'student1@hostel.edu',
                'CS2021001': 'student1@hostel.edu',
                '12345679': 'student2@hostel.edu',
                '12101002': 'student2@hostel.edu',
                'CS2021002': 'student2@hostel.edu',
                '12345680': 'student3@hostel.edu',
                '12101003': 'student3@hostel.edu',
                'CS2021003': 'student3@hostel.edu',
                '12345681': 'student4@hostel.edu',
                '12101004': 'student4@hostel.edu',
                'CS2021004': 'student4@hostel.edu',
            }
            warden_mapping = {
                'W101': 'warden.bh1@hostel.edu',
                '101': 'warden.bh1@hostel.edu',
                'W1': 'warden.bh1@hostel.edu',
                'WARDEN1': 'warden.bh1@hostel.edu',
                'W102': 'warden.gh1@hostel.edu',
                '102': 'warden.gh1@hostel.edu',
                'W2': 'warden.gh1@hostel.edu',
                'WARDEN2': 'warden.gh1@hostel.edu',
                'CW1': 'chiefwarden@hostel.edu',
                '100': 'chiefwarden@hostel.edu',
                'CHIEF': 'chiefwarden@hostel.edu',
                'CHIEFWARDEN': 'chiefwarden@hostel.edu',
                'ADMIN': 'admin@hostel.edu',
                '999': 'admin@hostel.edu',
                'SUPERADMIN': 'superadmin@hostel.edu',
                'SUPER_ADMIN': 'superadmin@hostel.edu',
                'DEAN': 'dean@hostel.edu',
                '888': 'dean@hostel.edu',
            }
            if reg_clean in student_mapping:
                resolved_email = student_mapping[reg_clean]
            elif reg_clean in warden_mapping:
                resolved_email = warden_mapping[reg_clean]

        # 7. Fallback search by email
        if not resolved_email:
            user_by_email = User.objects.filter(email__iexact=raw_identifier).first()
            if user_by_email:
                resolved_email = user_by_email.email

        if not resolved_email:
            raise serializers.ValidationError(
                f'No account found for "{raw_identifier}". Please check your Registration Number / Email or activate your account.'
            )

        user = authenticate(
            request=self.context.get('request'),
            email=resolved_email,
            password=password,
        )
        if not user:
            # Direct password check fallback
            candidate = User.objects.filter(email__iexact=resolved_email).first()
            if candidate and candidate.check_password(password):
                user = candidate
            else:
                raise serializers.ValidationError('Invalid password. Please check your password or use "Forgot Password".')

        if not user.is_active or getattr(user, 'account_status', 'ACTIVE') in ('SUSPENDED', 'REVOKED'):
            if getattr(user, 'account_status', 'ACTIVE') == 'SUSPENDED':
                raise serializers.ValidationError('Account has been suspended by administration.')
            if getattr(user, 'account_status', 'ACTIVE') == 'REVOKED':
                raise serializers.ValidationError('Account access has been revoked.')
            raise serializers.ValidationError('Account is disabled.')

        data['user'] = user
        return data


class StudentProfileSerializer(serializers.ModelSerializer):
    """Serializer for student profile data."""
    class Meta:
        model = StudentProfile
        fields = [
            'roll_number', 'department', 'year_of_study',
            'gender', 'fee_cleared', 'disciplinary_hold',
        ]
        read_only_fields = ['roll_number']


class UserSerializer(serializers.ModelSerializer):
    """Full user serializer with nested profile for students."""
    student_profile = StudentProfileSerializer(read_only=True)
    assigned_hostel_ids = serializers.SerializerMethodField()
    is_super_admin = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'role', 'phone', 'is_active', 'account_status', 'date_joined',
            'registration_number', 'warden_id', 'eligibility_classification',
            'is_email_verified', 'student_profile', 'assigned_hostel_ids',
            'permissions_list', 'is_super_admin',
        ]
        read_only_fields = ['id', 'email', 'role', 'date_joined', 'eligibility_classification', 'is_super_admin']

    def get_assigned_hostel_ids(self, obj):
        if obj.role in ('WARDEN', 'CHIEF_WARDEN'):
            return list(obj.warden_assignments.filter(is_active=True).values_list('hostel_id', flat=True))
        return []


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user info (for embedding in other responses)."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'role', 'registration_number']
        read_only_fields = fields

    def get_full_name(self, obj) -> str:
        return obj.get_full_name()


class ChangePasswordSerializer(serializers.Serializer):
    """Validates password change request."""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate_new_password(self, value):
        if len(value) < 12:
            raise serializers.ValidationError('Password must be at least 12 characters long.')
        validate_password(value)
        return value

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match.'
            })
        return data


class PasswordResetRequestSerializer(serializers.Serializer):
    """Validates password reset request."""
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Validates password reset confirmation."""
    token = serializers.CharField()
    uid = serializers.CharField()
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        if len(value) < 12:
            raise serializers.ValidationError('Password must be at least 12 characters long.')
        validate_password(value)
        return value

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match.'
            })
        return data


class WardenAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for warden-hostel assignments."""
    warden_name = serializers.SerializerMethodField()
    hostel_name = serializers.SerializerMethodField()

    class Meta:
        model = WardenAssignment
        fields = ['id', 'warden', 'hostel', 'warden_name', 'hostel_name', 'assigned_at', 'is_active']

    def get_warden_name(self, obj):
        return obj.warden.get_full_name()

    def get_hostel_name(self, obj):
        return obj.hostel.name


# ============================================================================
# STUDENT REGISTRATION SERIALIZERS (OTP + 12-char Password)
# ============================================================================

class StudentSignupRequestOtpSerializer(serializers.Serializer):
    """Validates Step 1 of Student Registration before issuing OTP."""
    registration_number = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    gender = serializers.ChoiceField(
        choices=[('MALE', 'Male'), ('FEMALE', 'Female'), ('OTHER', 'Other')],
        help_text="Student gender (used for hostel eligibility mapping)",
    )

    def validate(self, data):
        reg_no = data['registration_number'].strip().upper()
        email = data['email'].strip().lower()
        submitted_gender = data['gender']

        # 1. Registration Number length check
        if len(reg_no) != 8:
            raise serializers.ValidationError({
                'registration_number': 'Student registration number must be exactly 8 digits.'
            })

        # 2. Check if student already registered
        if User.objects.filter(registration_number__iexact=reg_no).exists() or \
           StudentProfile.objects.filter(roll_number__iexact=reg_no).exists():
            raise serializers.ValidationError({
                'registration_number': 'An account is already registered with this registration number. Please login.'
            })

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({
                'email': 'An account with this email address is already registered. Please login.'
            })

        # 3. Check authorized student roster (with AuthorizedIdentity fallback)
        from .models import AuthorizedStudent, AuthorizedIdentity
        authorized = AuthorizedStudent.objects.filter(registration_number__iexact=reg_no).first()
        if not authorized:
            ident = AuthorizedIdentity.objects.filter(institution_id__iexact=reg_no).first()
            if ident and ident.role == 'STUDENT':
                authorized, _ = AuthorizedStudent.objects.get_or_create(
                    registration_number=ident.institution_id,
                    defaults={
                        'email': ident.trusted_email,
                        'full_name': ident.name,
                        'gender': ident.gender or 'MALE',
                        'approved_eligibility': ident.eligibility_classification or 'BOYS',
                        'department': ident.department or 'Computer Science',
                        'year_of_study': ident.year_of_study or 1,
                        'initial_hostel_code': ident.initial_hostel_code or 'BH1',
                        'initial_room': ident.initial_room or '101',
                        'initial_bed': ident.initial_bed or 'A',
                        'authorization_status': AuthorizedStudent.Status.ACTIVE,
                    }
                )

        if not authorized:
            raise serializers.ValidationError({
                'registration_number': 'Registration number not found in university authorized student roster. Contact hostel administration.'
            })

        if authorized.authorization_status != AuthorizedStudent.Status.ACTIVE:
            raise serializers.ValidationError({
                'registration_number': f'Student authorization is {authorized.authorization_status.lower()}. Cannot register.'
            })

        if authorized.email.lower() != email:
            raise serializers.ValidationError({
                'email': 'Submitted email does not match the institution-approved email on record for this registration number.'
            })

        # 4. Validate submitted gender against institution-approved record
        # Gender selection is verified against the institution's student record.
        # Students cannot self-alter gender to circumvent hostel policy.
        if authorized.gender and authorized.gender != submitted_gender:
            raise serializers.ValidationError({
                'gender': (
                    f"Submitted gender does not match your university record ({authorized.get_gender_display()}). "
                    "Gender and hostel eligibility are verified against official records to enforce hostel policy. "
                    "To correct an official institutional discrepancy, please contact the Hostel Administration."
                )
            })

        data['authorized_student'] = authorized
        return data


class StudentSignupVerifyOtpSerializer(serializers.Serializer):
    """Validates Step 2: 6-digit OTP for Student Registration."""
    registration_number = serializers.CharField(max_length=20)
    otp = serializers.CharField(min_length=6, max_length=6)


class StudentSignupCompleteSerializer(serializers.Serializer):
    """Validates Step 3: Password creation (at least 12 chars) with single-use verification token."""
    registration_number = serializers.CharField(max_length=20)
    verification_token = serializers.CharField(max_length=128)
    password = serializers.CharField(min_length=12, write_only=True)
    confirm_password = serializers.CharField(min_length=12, write_only=True)

    def validate_password(self, value):
        if len(value) < 12:
            raise serializers.ValidationError('Password must be at least 12 characters long.')
        validate_password(value)
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match.'
            })
        return data


# ============================================================================
# WARDEN REGISTRATION SERIALIZERS (Dedicated Flow + Assigned Hostel Scope)
# ============================================================================

class WardenSignupRequestOtpSerializer(serializers.Serializer):
    """Validates Step 1 of Warden Registration against pre-authorized roster."""
    warden_id = serializers.CharField(max_length=20)
    email = serializers.EmailField()

    def validate(self, data):
        warden_id = data['warden_id'].strip().upper()
        email = data['email'].strip().lower()

        # 1. Check if warden already registered
        if User.objects.filter(warden_id__iexact=warden_id).exists() or \
           User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({
                'warden_id': 'An account is already registered with this Warden ID/email. Please login.'
            })

        # 2. Check AuthorizedWarden pre-authorized roster (with AuthorizedIdentity fallback)
        from .models import AuthorizedWarden, AuthorizedIdentity
        authorized = AuthorizedWarden.objects.filter(warden_id__iexact=warden_id).first()
        if not authorized:
            ident = AuthorizedIdentity.objects.filter(institution_id__iexact=warden_id).first()
            if ident and ident.role in ('WARDEN', 'CHIEF_WARDEN'):
                authorized, _ = AuthorizedWarden.objects.get_or_create(
                    warden_id=ident.institution_id,
                    defaults={
                        'email': ident.trusted_email,
                        'full_name': ident.name,
                        'authorization_status': AuthorizedWarden.Status.ACTIVE,
                    }
                )

        if not authorized:
            raise serializers.ValidationError({
                'warden_id': 'Warden/Employee ID is not pre-authorized. Registration must be authorized by Hostel Administration.'
            })

        if authorized.authorization_status != AuthorizedWarden.Status.ACTIVE:
            raise serializers.ValidationError({
                'warden_id': f'Warden authorization status is {authorized.authorization_status.lower()}. Cannot register.'
            })

        if authorized.email.lower() != email:
            raise serializers.ValidationError({
                'email': 'Submitted email does not match official institutional email on record for this Warden ID.'
            })

        data['authorized_warden'] = authorized
        return data


class WardenSignupVerifyOtpSerializer(serializers.Serializer):
    """Validates Step 2: 6-digit OTP for Warden Registration."""
    warden_id = serializers.CharField(max_length=20)
    otp = serializers.CharField(min_length=6, max_length=6)


class WardenSignupCompleteSerializer(serializers.Serializer):
    """Validates Step 3: Password creation (at least 12 chars) with single-use verification token."""
    warden_id = serializers.CharField(max_length=20)
    verification_token = serializers.CharField(max_length=128)
    password = serializers.CharField(min_length=12, write_only=True)
    confirm_password = serializers.CharField(min_length=12, write_only=True)

    def validate_password(self, value):
        if len(value) < 12:
            raise serializers.ValidationError('Password must be at least 12 characters long.')
        validate_password(value)
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match.'
            })
        return data


# ============================================================================
# PASSWORD RESET VIA OTP SERIALIZERS
# ============================================================================

class PasswordResetOtpRequestSerializer(serializers.Serializer):
    """Request a 6-digit OTP for password reset."""
    identifier = serializers.CharField(
        help_text="Registration Number, Warden ID, or Email Address"
    )


class PasswordResetOtpVerifySerializer(serializers.Serializer):
    """Verify 6-digit OTP for password reset."""
    identifier = serializers.CharField()
    otp = serializers.CharField(min_length=6, max_length=6)


class PasswordResetOtpCompleteSerializer(serializers.Serializer):
    """Reset password using verified single-use token (min 12 characters)."""
    identifier = serializers.CharField()
    verification_token = serializers.CharField(max_length=128)
    new_password = serializers.CharField(min_length=12, write_only=True)
    confirm_password = serializers.CharField(min_length=12, write_only=True)

    def validate_new_password(self, value):
        if len(value) < 12:
            raise serializers.ValidationError('Password must be at least 12 characters long.')
        validate_password(value)
        return value

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match.'
            })
        return data


# ============================================================================
# ADMIN ROSTER MANAGEMENT SERIALIZERS
# ============================================================================

from .models import AuthorizedStudent, AuthorizedWarden

class AuthorizedStudentSerializer(serializers.ModelSerializer):
    """Admin CRUD serializer for pre-authorized student roster."""
    class Meta:
        model = AuthorizedStudent
        fields = [
            'id', 'registration_number', 'email', 'full_name',
            'department', 'year_of_study', 'gender',
            'approved_eligibility', 'authorization_status',
            'is_registered', 'initial_hostel_code', 'initial_room',
            'initial_bed', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'is_registered', 'created_at', 'updated_at']

    def validate_registration_number(self, value):
        val = value.strip().upper()
        if len(val) != 8:
            raise serializers.ValidationError('Registration number must be exactly 8 characters.')
        return val

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if not ret.get('is_registered'):
            from django.contrib.auth import get_user_model
            from django.db.models import Q
            from .models import AuthorizedIdentity, OTPChallenge
            User = get_user_model()
            is_reg = (
                User.objects.filter(
                    Q(registration_number__iexact=instance.registration_number) |
                    Q(email__iexact=instance.email)
                ).exists() or
                AuthorizedIdentity.objects.filter(
                    institution_id__iexact=instance.registration_number,
                    activation_status=AuthorizedIdentity.ActivationStatus.ACTIVE
                ).exists() or
                OTPChallenge.objects.filter(
                    Q(identifier__iexact=instance.registration_number) |
                    Q(identifier__iexact=instance.email),
                    is_consumed=True
                ).exists()
            )
            if is_reg:
                ret['is_registered'] = True
                AuthorizedStudent.objects.filter(pk=instance.pk).update(is_registered=True)
        return ret


class AuthorizedWardenSerializer(serializers.ModelSerializer):
    """Admin CRUD serializer for pre-authorized warden roster."""
    assigned_hostels_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = AuthorizedWarden
        fields = [
            'id', 'warden_id', 'email', 'full_name', 'phone',
            'role', 'assigned_hostels', 'assigned_hostels_details',
            'authorization_status', 'is_registered', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'is_registered', 'created_at', 'updated_at']

    def get_assigned_hostels_details(self, obj) -> list[dict]:
        return [
            {'id': h.id, 'name': h.name, 'code': h.code, 'category': h.hostel_category}
            for h in obj.assigned_hostels.all()
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if not ret.get('is_registered'):
            from django.contrib.auth import get_user_model
            from django.db.models import Q
            from .models import AuthorizedIdentity, OTPChallenge
            User = get_user_model()
            is_reg = (
                User.objects.filter(
                    Q(warden_id__iexact=instance.warden_id) |
                    Q(email__iexact=instance.email)
                ).exists() or
                AuthorizedIdentity.objects.filter(
                    institution_id__iexact=instance.warden_id,
                    activation_status=AuthorizedIdentity.ActivationStatus.ACTIVE
                ).exists() or
                OTPChallenge.objects.filter(
                    Q(identifier__iexact=instance.warden_id) |
                    Q(identifier__iexact=instance.email),
                    is_consumed=True
                ).exists()
            )
            if is_reg:
                ret['is_registered'] = True
                AuthorizedWarden.objects.filter(pk=instance.pk).update(is_registered=True)
        return ret


def mask_email(email: str) -> str:
    """Mask email address for privacy."""
    parts = email.split('@')
    if len(parts) != 2:
        return '***'
    user_part, domain = parts
    if len(user_part) <= 2:
        masked_user = user_part[0] + '***'
    else:
        masked_user = user_part[:2] + '***' + user_part[-1]
    return f"{masked_user}@{domain}"


class AuthorizedIdentitySerializer(serializers.ModelSerializer):
    """Serializer for AuthorizedIdentities managed by Super Admin."""
    masked_email = serializers.SerializerMethodField(read_only=True)
    created_by_name = serializers.SerializerMethodField(read_only=True)
    last_login_at = serializers.SerializerMethodField(read_only=True)
    active_otp = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = AuthorizedIdentity
        fields = [
            'id', 'institution_id', 'name', 'trusted_email', 'masked_email',
            'role', 'permissions', 'assigned_hostel_ids', 'eligibility_classification',
            'department', 'year_of_study', 'gender', 'initial_hostel_code',
            'initial_room', 'initial_bed', 'authorization_status', 'activation_status',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'activated_at', 'revoked_at', 'last_invitation_sent_at', 'last_login_at',
            'active_otp',
        ]
        read_only_fields = [
            'id', 'created_by', 'created_by_name', 'created_at', 'updated_at',
            'activated_at', 'revoked_at', 'last_invitation_sent_at', 'last_login_at',
            'active_otp',
        ]

    def get_masked_email(self, obj) -> str:
        return mask_email(obj.trusted_email)

    def get_created_by_name(self, obj) -> str:
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return 'System Setup'

    def get_last_login_at(self, obj) -> str | None:
        user = obj.user_accounts.first()
        return user.last_login_at.isoformat() if user and user.last_login_at else None

    def get_active_otp(self, obj) -> str | None:
        request = self.context.get('request')
        if not request or not getattr(request, 'user', None) or not request.user.is_authenticated:
            return None
        from django.utils import timezone
        active_challenge = OTPChallenge.objects.filter(
            authorized_identity=obj,
            is_consumed=False,
            expires_at__gt=timezone.now(),
        ).order_by('-created_at').first()
        if active_challenge and isinstance(active_challenge.payload, dict):
            return active_challenge.payload.get('active_otp')
        return None


class AddStudentIdentitySerializer(serializers.Serializer):
    """Add student identity validation."""
    registration_number = serializers.CharField(max_length=50)
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    eligibility_classification = serializers.ChoiceField(
        choices=['BOYS', 'GIRLS', 'COED'],
        default='BOYS',
    )
    gender = serializers.ChoiceField(
        choices=['MALE', 'FEMALE', 'OTHER'],
        default='MALE',
    )
    department = serializers.CharField(max_length=100, required=False, allow_blank=True)
    year_of_study = serializers.IntegerField(default=1, min_value=1, max_value=8)
    initial_hostel_code = serializers.CharField(max_length=20, required=False, allow_blank=True)
    initial_room = serializers.CharField(max_length=20, required=False, allow_blank=True)
    initial_bed = serializers.CharField(max_length=10, required=False, allow_blank=True)

    def validate_registration_number(self, value):
        val = value.strip().upper()
        if AuthorizedIdentity.objects.filter(institution_id__iexact=val).exists():
            raise serializers.ValidationError('An authorized identity with this registration number already exists.')
        return val

    def validate_email(self, value):
        val = value.strip().lower()
        if AuthorizedIdentity.objects.filter(trusted_email__iexact=val).exists():
            raise serializers.ValidationError('An authorized identity with this email already exists.')
        return val


class AddWardenIdentitySerializer(serializers.Serializer):
    """Add warden identity validation."""
    warden_id = serializers.CharField(max_length=50, required=False)
    staff_id = serializers.CharField(max_length=50, required=False)
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=['WARDEN', 'CHIEF_WARDEN'],
        default='WARDEN',
    )
    assigned_hostel_ids = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )
    assigned_hostels = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )
    permissions = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )

    def validate(self, data):
        wid = data.get('warden_id') or data.get('staff_id')
        if not wid:
            raise serializers.ValidationError({'warden_id': 'Warden ID or Staff ID is required.'})
        clean_wid = wid.strip().upper()
        if AuthorizedIdentity.objects.filter(institution_id__iexact=clean_wid).exists():
            raise serializers.ValidationError({'warden_id': 'An authorized identity with this Warden ID already exists.'})
        data['warden_id'] = clean_wid

        hostels = data.get('assigned_hostel_ids') or data.get('assigned_hostels') or []
        data['assigned_hostel_ids'] = hostels
        return data

    def validate_email(self, value):
        val = value.strip().lower()
        if AuthorizedIdentity.objects.filter(trusted_email__iexact=val).exists():
            raise serializers.ValidationError('An authorized identity with this email already exists.')
        return val


class AddAdminIdentitySerializer(serializers.Serializer):
    """Add administrator identity validation (Super Admin only)."""
    staff_id = serializers.CharField(max_length=50)
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=['HOSTEL_ADMIN', 'SUPER_ADMIN'],
        default='HOSTEL_ADMIN',
    )
    permissions = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )

    def validate_staff_id(self, value):
        val = value.strip().upper()
        if AuthorizedIdentity.objects.filter(institution_id__iexact=val).exists():
            raise serializers.ValidationError('An authorized identity with this Staff ID already exists.')
        return val

    def validate_email(self, value):
        val = value.strip().lower()
        if AuthorizedIdentity.objects.filter(trusted_email__iexact=val).exists():
            raise serializers.ValidationError('An authorized identity with this email already exists.')
        return val


class ActivationRequestOtpSerializer(serializers.Serializer):
    """Request OTP for authorized identity verification."""
    identifier = serializers.CharField(required=False)
    institution_id = serializers.CharField(required=False)
    reg_id = serializers.CharField(required=False)
    registration_number = serializers.CharField(required=False)
    warden_id = serializers.CharField(required=False)
    staff_id = serializers.CharField(required=False)
    email = serializers.EmailField(required=True)

    def validate(self, data):
        inst_id = (
            data.get('identifier') or
            data.get('institution_id') or
            data.get('reg_id') or
            data.get('registration_number') or
            data.get('warden_id') or
            data.get('staff_id')
        )
        if not inst_id:
            raise serializers.ValidationError({
                'institution_id': 'Registration ID / Staff ID / Institution ID is required.'
            })
        data['institution_id'] = inst_id.strip()
        data['email'] = data['email'].strip().lower()
        return data


class ActivationVerifyOtpSerializer(serializers.Serializer):
    """Verify OTP challenge."""
    identifier = serializers.CharField(required=True)
    otp = serializers.CharField(min_length=6, max_length=6, required=True)


class ActivationSetPasswordSerializer(serializers.Serializer):
    """Set personal password to finalize account activation."""
    identifier = serializers.CharField(required=True)
    verification_token = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    confirm_password = serializers.CharField(write_only=True, required=False)
    password_confirm = serializers.CharField(write_only=True, required=False)

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError('Password must be at least 8 characters long.')
        if not any(c.isalpha() for c in value):
            raise serializers.ValidationError('Password must contain at least one letter.')
        if not any(c.isdigit() or not c.isalnum() for c in value):
            raise serializers.ValidationError('Password must contain at least one number or special character.')
        return value

    def validate(self, data):
        confirm = data.get('confirm_password') or data.get('password_confirm')
        if not confirm:
            raise serializers.ValidationError({'confirm_password': 'Confirm password is required.'})
        if data['password'] != confirm:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        data['confirm_password'] = confirm
        return data

