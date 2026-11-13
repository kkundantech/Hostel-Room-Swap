"""
Module: backend/apps/accounts/models.py

Work / Purpose:
    Defines custom User, StudentProfile, WardenAssignment, AuthorizedStudent, AuthorizedWarden, AuthorizedIdentity, OTPChallenge, and EmailVerificationChallenge models.

Connected Modules (Used By / Routes):
    - backend/apps/accounts/admin.py
    - backend/apps/accounts/management/commands/provision_super_admin.py
    - backend/apps/accounts/otp.py
    - backend/apps/accounts/serializers.py
    - backend/apps/accounts/test_admin_modules.py
    - backend/apps/accounts/test_otp_authorization.py
    - backend/apps/accounts/views.py
    - backend/apps/accounts/views_activation.py
    - backend/apps/accounts/views_super_admin.py
    - backend/apps/analytics/views.py
    - backend/apps/hostels/management/commands/seed_demo_data.py
    - backend/apps/integrations/views.py
    - backend/apps/matching/management/commands/activate_full_pipeline.py
    - backend/apps/notifications/services.py
    - backend/config/settings.py (AUTH_USER_MODEL = 'accounts.User')
    - backend/tests/conftest.py
    - backend/tests/test_atomic_approval.py
    - backend/tests/test_auth_and_eligibility.py
    - backend/tests/test_concurrency_and_reconciliation.py

Helpful / Supporting Modules (Dependencies):
    - django (external library / framework)

Original Module Notes:
    Custom User model and Student Profile for the Hostel Room Exchange Platform.

    Roles:
    - STUDENT: Can create exchange requests, accept/decline proposals
    - WARDEN: Can approve/reject proposals for assigned hostels
    - CHIEF_WARDEN: Can approve cross-hostel exchanges
    - HOSTEL_ADMIN: Can manage hostel data, policies, roles
    - DEAN: Read-only analytics access
"""
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.core.validators import RegexValidator


class UserManager(BaseUserManager):
    """Custom user manager supporting email-based authentication."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email address is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', self.model.Role.SUPER_ADMIN)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom user model with role-based access control.

    Uses email as the primary authentication identifier.
    """

    class Role(models.TextChoices):
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Administrator'
        STUDENT = 'STUDENT', 'Student'
        WARDEN = 'WARDEN', 'Warden'
        CHIEF_WARDEN = 'CHIEF_WARDEN', 'Chief Warden'
        HOSTEL_ADMIN = 'HOSTEL_ADMIN', 'Hostel Administrator'
        DEAN = 'DEAN', 'Dean of Student Welfare'

    class AccountStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        SUSPENDED = 'SUSPENDED', 'Suspended'
        REVOKED = 'REVOKED', 'Revoked'

    # Override username field to use email
    username = None
    email = models.EmailField('Email Address', unique=True)

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT,
        db_index=True,
    )

    phone = models.CharField(
        max_length=15,
        blank=True,
        validators=[RegexValidator(
            regex=r'^\+?1?\d{9,15}$',
            message='Enter a valid phone number.'
        )],
    )

    registration_number = models.CharField(
        max_length=20,
        blank=True,
        db_index=True,
        help_text='Student University Registration Number or Warden ID',
    )
    warden_id = models.CharField(
        max_length=20,
        blank=True,
        db_index=True,
        help_text='Official Warden / Employee ID',
    )
    is_email_verified = models.BooleanField(
        default=True,
        help_text='Whether email has been verified via OTP',
    )
    eligibility_classification = models.CharField(
        max_length=20,
        blank=True,
        db_index=True,
        help_text='Institution-approved hostel eligibility (e.g. BOYS, GIRLS)',
    )
    account_status = models.CharField(
        max_length=20,
        choices=AccountStatus.choices,
        default=AccountStatus.ACTIVE,
        db_index=True,
        help_text='Authoritative account status for security revocation',
    )
    session_version = models.PositiveIntegerField(
        default=1,
        db_index=True,
        help_text='Session version incremented on logout, suspension, or credential change to invalidate existing tokens',
    )
    permissions_list = models.JSONField(
        default=list,
        blank=True,
        help_text='Explicitly granted permissions list for staff/admins',
    )
    authorized_identity = models.ForeignKey(
        'AuthorizedIdentity',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='user_accounts',
        help_text='Reference to the original Super-Admin authorized identity',
    )
    last_login_at = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = UserManager()

    class Meta:
        db_table = 'users'
        ordering = ['email']
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['email']),
            models.Index(fields=['account_status']),
        ]

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    @property
    def is_super_admin(self):
        return self.role == self.Role.SUPER_ADMIN or self.is_superuser

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT

    @property
    def is_warden(self):
        return self.role == self.Role.WARDEN

    @property
    def is_chief_warden(self):
        return self.role == self.Role.CHIEF_WARDEN

    @property
    def is_hostel_admin(self):
        return self.role == self.Role.HOSTEL_ADMIN

    @property
    def is_dean(self):
        return self.role == self.Role.DEAN


class StudentProfile(models.Model):
    """
    Extended profile for students.

    Stores student-specific data such as roll number, department,
    year of study, and gender. Linked to the hostel allocation system.
    """

    class Gender(models.TextChoices):
        MALE = 'MALE', 'Male'
        FEMALE = 'FEMALE', 'Female'
        OTHER = 'OTHER', 'Other'

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='student_profile',
        limit_choices_to={'role': User.Role.STUDENT},
    )

    roll_number = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text='Unique student roll/registration number',
    )

    department = models.CharField(max_length=100, blank=True)
    year_of_study = models.PositiveSmallIntegerField(default=1)
    gender = models.CharField(
        max_length=10,
        choices=Gender.choices,
        db_index=True,
    )

    # Fee and disciplinary status (mock fields; real data from ERP integration)
    fee_cleared = models.BooleanField(
        default=True,
        help_text='Hostel fee clearance status (mock: set True for demo)',
    )
    disciplinary_hold = models.BooleanField(
        default=False,
        help_text='Whether the student has an active disciplinary hold',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_profiles'
        ordering = ['roll_number']

    def __str__(self):
        return f"{self.roll_number} - {self.user.get_full_name()}"


class WardenAssignment(models.Model):
    """
    Maps wardens to the hostels they are authorized to manage.

    A warden can be assigned to multiple hostels.
    """
    warden = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='warden_assignments',
        limit_choices_to={'role__in': [User.Role.WARDEN, User.Role.CHIEF_WARDEN]},
    )
    hostel = models.ForeignKey(
        'hostels.Hostel',
        on_delete=models.CASCADE,
        related_name='warden_assignments',
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'warden_assignments'
        unique_together = ['warden', 'hostel']
        ordering = ['-assigned_at']

    def __str__(self):
        return f"{self.warden.get_full_name()} -> {self.hostel.name}"


class AuthorizedStudent(models.Model):
    """
    Admin-authorized student roster for registration verification.

    Before a student can register:
    - Their University Registration Number must exist here.
    - Their email must match the trusted institution-authorized email.
    - Their approved hostel eligibility is verified from this record.
    """
    class Eligibility(models.TextChoices):
        BOYS = 'BOYS', "Boys' Hostel (Male)"
        GIRLS = 'GIRLS', "Girls' Hostel (Female)"
        COED = 'COED', "Co-ed / Special"

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active / Eligible'
        SUSPENDED = 'SUSPENDED', 'Suspended'
        REVOKED = 'REVOKED', 'Revoked'

    registration_number = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Official University Registration Number (e.g. 12345678)",
    )
    email = models.EmailField(
        unique=True,
        db_index=True,
        help_text="Trusted university-approved institutional email",
    )
    full_name = models.CharField(max_length=150, blank=True)
    department = models.CharField(max_length=100, blank=True)
    year_of_study = models.PositiveSmallIntegerField(default=1)
    gender = models.CharField(
        max_length=10,
        choices=StudentProfile.Gender.choices,
        default=StudentProfile.Gender.MALE,
        help_text="Institution-recorded student gender",
    )
    approved_eligibility = models.CharField(
        max_length=10,
        choices=Eligibility.choices,
        default=Eligibility.BOYS,
        db_index=True,
        help_text="Approved hostel category eligibility",
    )
    authorization_status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    is_registered = models.BooleanField(
        default=False,
        db_index=True,
        help_text="True if student has already registered an account",
    )
    initial_hostel_code = models.CharField(
        max_length=20,
        blank=True,
        help_text="Optional pre-allocated hostel code (e.g. BH1)",
    )
    initial_room = models.CharField(
        max_length=20,
        blank=True,
        help_text="Optional pre-allocated room number (e.g. 101)",
    )
    initial_bed = models.CharField(
        max_length=10,
        blank=True,
        help_text="Optional pre-allocated bed (e.g. A)",
    )
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='authorized_students_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'authorized_students'
        ordering = ['registration_number']
        indexes = [
            models.Index(fields=['registration_number', 'email']),
            models.Index(fields=['approved_eligibility', 'authorization_status']),
        ]

    def __str__(self):
        return f"{self.registration_number} ({self.email}) - {self.approved_eligibility}"

    def clean(self):
        if self.email:
            self.email = self.email.strip().lower()
        if self.registration_number:
            self.registration_number = self.registration_number.strip().upper()


class AuthorizedWarden(models.Model):
    """
    Admin-authorized Warden roster for official warden registration.

    Enforces that only explicitly pre-authorized Warden IDs and institutional
    emails can create warden accounts with assigned hostel scopes.
    """
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active / Pre-authorized'
        PENDING_APPROVAL = 'PENDING_APPROVAL', 'Pending Institutional Approval'
        SUSPENDED = 'SUSPENDED', 'Suspended'
        REVOKED = 'REVOKED', 'Revoked'

    warden_id = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Official Warden/Employee ID (e.g. W101, CW1)",
    )
    email = models.EmailField(
        unique=True,
        db_index=True,
        help_text="Official institutional email",
    )
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=15, blank=True)
    role = models.CharField(
        max_length=20,
        choices=[
            (User.Role.WARDEN, 'Warden'),
            (User.Role.CHIEF_WARDEN, 'Chief Warden'),
        ],
        default=User.Role.WARDEN,
        help_text="Authorized role granted upon account creation",
    )
    assigned_hostels = models.ManyToManyField(
        'hostels.Hostel',
        related_name='authorized_wardens',
        blank=True,
        help_text="Authorized hostel scope assigned to this warden",
    )
    authorization_status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    is_registered = models.BooleanField(
        default=False,
        db_index=True,
        help_text="True once account password creation is completed",
    )
    approved_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='authorized_wardens_approved',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'authorized_wardens'
        ordering = ['warden_id']
        indexes = [
            models.Index(fields=['warden_id', 'email']),
        ]

    def __str__(self):
        return f"{self.warden_id} - {self.full_name} ({self.email})"

    def clean(self):
        if self.email:
            self.email = self.email.strip().lower()
        if self.warden_id:
            self.warden_id = self.warden_id.strip().upper()


class EmailVerificationChallenge(models.Model):
    """
    Manages secure one-time passwords (OTP) for registration and password reset.

    Security rules:
    - 6-digit numeric OTP.
    - Stored ONLY as cryptographic salted hash (never in plaintext).
    - Expires after 5 minutes.
    - Max 5 verification attempts before invalidation.
    - 60-second cooldown between resends.
    - Invalidated upon successful verification; issues a single-use verification_token
      valid for password completion.
    """
    class Purpose(models.TextChoices):
        STUDENT_REGISTRATION = 'STUDENT_REGISTRATION', 'Student Registration'
        WARDEN_REGISTRATION = 'WARDEN_REGISTRATION', 'Warden Registration'
        PASSWORD_RESET = 'PASSWORD_RESET', 'Password Reset'

    identifier = models.CharField(
        max_length=150,
        db_index=True,
        help_text="Primary identity key: normalized email or registration number",
    )
    purpose = models.CharField(
        max_length=30,
        choices=Purpose.choices,
        db_index=True,
    )
    otp_hash = models.CharField(
        max_length=256,
        help_text="Cryptographically salted hash of the 6-digit OTP",
    )
    verification_token = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        unique=True,
        db_index=True,
        help_text="Opaque single-use token granted after OTP verification to allow password creation",
    )
    attempts = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=5)
    resend_available_at = models.DateTimeField()
    expires_at = models.DateTimeField(db_index=True)
    is_consumed = models.BooleanField(default=False, db_index=True)
    payload = models.JSONField(
        default=dict,
        blank=True,
        help_text="Secure metadata payload associated with this challenge (e.g. verified reg_no, gender)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'email_verification_challenges'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['identifier', 'purpose', 'is_consumed']),
        ]

    def __str__(self):
        return f"{self.purpose} challenge for {self.identifier} ({'consumed' if self.is_consumed else 'active'})"


class AuthorizedIdentity(models.Model):
    """
    Centralized Authorized Identity Registry for RoomSwap.
    
    Only the Super Admin can authorize identities and provision Student,
    Warden, and Admin accounts. Unrestricted public signup is disabled.
    """
    class Role(models.TextChoices):
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Administrator'
        STUDENT = 'STUDENT', 'Student'
        WARDEN = 'WARDEN', 'Warden'
        CHIEF_WARDEN = 'CHIEF_WARDEN', 'Chief Warden'
        HOSTEL_ADMIN = 'HOSTEL_ADMIN', 'Hostel Administrator'
        DEAN = 'DEAN', 'Dean of Student Welfare'

    class AuthorizationStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        SUSPENDED = 'SUSPENDED', 'Suspended'
        REVOKED = 'REVOKED', 'Revoked'

    class ActivationStatus(models.TextChoices):
        INVITED = 'INVITED', 'Invited'
        PENDING_ACTIVATION = 'PENDING_ACTIVATION', 'Pending Activation'
        ACTIVE = 'ACTIVE', 'Active'
        SUSPENDED = 'SUSPENDED', 'Suspended'
        REVOKED = 'REVOKED', 'Revoked'

    institution_id = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Registration Number, Warden/Staff ID, or Employee ID",
    )
    name = models.CharField(max_length=150, help_text="Full Name")
    trusted_email = models.EmailField(
        unique=True,
        db_index=True,
        help_text="Institution-verified trusted email",
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT,
        db_index=True,
    )
    permissions = models.JSONField(
        default=list,
        blank=True,
        help_text="Explicitly granted permissions list",
    )
    assigned_hostel_ids = models.JSONField(
        default=list,
        blank=True,
        help_text="List of hostel IDs or codes assigned to this identity",
    )
    eligibility_classification = models.CharField(
        max_length=20,
        blank=True,
        default='BOYS',
        help_text="Hostel category eligibility for students (BOYS, GIRLS, COED)",
    )
    department = models.CharField(max_length=100, blank=True)
    year_of_study = models.PositiveSmallIntegerField(default=1)
    gender = models.CharField(max_length=10, blank=True, default='MALE')

    initial_hostel_code = models.CharField(max_length=20, blank=True)
    initial_room = models.CharField(max_length=20, blank=True)
    initial_bed = models.CharField(max_length=10, blank=True)

    authorization_status = models.CharField(
        max_length=20,
        choices=AuthorizationStatus.choices,
        default=AuthorizationStatus.ACTIVE,
        db_index=True,
    )
    activation_status = models.CharField(
        max_length=25,
        choices=ActivationStatus.choices,
        default=ActivationStatus.INVITED,
        db_index=True,
    )

    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='authorized_identities_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    last_invitation_sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'authorized_identities'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['institution_id', 'trusted_email']),
            models.Index(fields=['role', 'activation_status']),
        ]

    def __str__(self):
        return f"{self.institution_id} - {self.name} ({self.role}) [{self.activation_status}]"

    def clean(self):
        if self.trusted_email:
            self.trusted_email = self.trusted_email.strip().lower()
        if self.institution_id:
            self.institution_id = self.institution_id.strip().upper()


class OTPChallenge(models.Model):
    """
    Cryptographically secure OTP challenge for identity verification,
    account activation, and password management.
    """
    class Purpose(models.TextChoices):
        ACTIVATION = 'ACTIVATION', 'Account Activation'
        PASSWORD_RESET = 'PASSWORD_RESET', 'Password Reset'

    authorized_identity = models.ForeignKey(
        AuthorizedIdentity,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='otp_challenges',
    )
    identifier = models.CharField(
        max_length=150,
        db_index=True,
        help_text="Primary identity key: normalized institution_id or email",
    )
    purpose = models.CharField(
        max_length=30,
        choices=Purpose.choices,
        default=Purpose.ACTIVATION,
        db_index=True,
    )
    otp_hash = models.CharField(
        max_length=256,
        help_text="Cryptographically salted HMAC-SHA256 hash of the 6-digit OTP",
    )
    verification_token = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        unique=True,
        db_index=True,
        help_text="Opaque single-use token granted after OTP verification",
    )
    attempt_count = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=5)
    resend_available_at = models.DateTimeField()
    expires_at = models.DateTimeField(db_index=True)
    is_consumed = models.BooleanField(default=False, db_index=True)
    consumed_at = models.DateTimeField(null=True, blank=True)
    invalidated_at = models.DateTimeField(null=True, blank=True)
    payload = models.JSONField(
        default=dict,
        blank=True,
        help_text="Secure challenge metadata",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'otp_challenges'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['identifier', 'purpose', 'is_consumed']),
        ]

    def __str__(self):
        return f"{self.purpose} challenge for {self.identifier} ({'consumed' if self.is_consumed else 'active'})"

