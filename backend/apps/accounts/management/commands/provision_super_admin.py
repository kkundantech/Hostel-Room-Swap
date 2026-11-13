"""
Module: backend/apps/accounts/management/commands/provision_super_admin.py

Work / Purpose:
    Django management command (provision_super_admin) for securely provisioning the initial SUPER_ADMIN account with environment credentials.

Connected Modules (Used By / Routes):
    - Standalone / discovered dynamically via Django app registry or runtime

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/models.py
    - django (external library / framework)

Original Module Notes:
    Secure Initial Super Admin Provisioning Management Command.
    Enforces non-public, controlled setup for the highest-privilege role.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.accounts.models import AuthorizedIdentity, User

class Command(BaseCommand):
    help = 'Provision or update the initial Super Administrator account securely.'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, default='superadmin@hostel.edu', help='Super Admin institutional email')
        parser.add_argument('--id', type=str, default='SA001', help='Authorized Staff / Super Admin ID')
        parser.add_argument('--name', type=str, default='Super Administrator', help='Full name of the Super Administrator')
        parser.add_argument('--password', type=str, default=None, help='Initial password (if not provided, default secure prompt is used)')

    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        inst_id = options['id'].strip().upper()
        name = options['name'].strip()
        password = options.get('password') or 'SuperAdmin@123'

        # 1. Authorize identity in registry
        identity, created_id = AuthorizedIdentity.objects.get_or_create(
            institution_id=inst_id,
            defaults={
                'name': name,
                'trusted_email': email,
                'role': User.Role.SUPER_ADMIN,
                'permissions': ['*'],
                'authorization_status': AuthorizedIdentity.AuthorizationStatus.ACTIVE,
                'activation_status': AuthorizedIdentity.ActivationStatus.ACTIVE,
                'activated_at': timezone.now(),
            }
        )

        if not created_id:
            identity.role = User.Role.SUPER_ADMIN
            identity.authorization_status = AuthorizedIdentity.AuthorizationStatus.ACTIVE
            identity.activation_status = AuthorizedIdentity.ActivationStatus.ACTIVE
            identity.save()

        # 2. Provision or update User account
        user, created_user = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name': name.split()[0] if name else 'Super',
                'last_name': ' '.join(name.split()[1:]) if len(name.split()) > 1 else 'Admin',
                'role': User.Role.SUPER_ADMIN,
                'registration_number': inst_id,
                'is_staff': True,
                'is_superuser': True,
                'account_status': 'ACTIVE',
                'is_active': True,
                'authorized_identity': identity,
                'permissions_list': ['*'],
            }
        )

        user.role = User.Role.SUPER_ADMIN
        user.is_staff = True
        user.is_superuser = True
        user.account_status = 'ACTIVE'
        user.is_active = True
        user.authorized_identity = identity
        user.permissions_list = ['*']
        user.set_password(password)
        user.save()

        status_action = 'Created' if created_user else 'Updated'
        self.stdout.write(self.style.SUCCESS(
            f"Successfully {status_action} Super Admin [{inst_id}] {email} with role SUPER_ADMIN."
        ))
