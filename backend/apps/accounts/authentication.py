"""
Module: backend/apps/accounts/authentication.py

Work / Purpose:
    Implements RoomSwapJWTAuthentication (enforcing user active status, email verification, and session_version revocation) and JWT token pair issuance.

Connected Modules (Used By / Routes):
    - backend/apps/accounts/test_otp_authorization.py
    - backend/apps/accounts/views.py
    - backend/config/settings.py

Helpful / Supporting Modules (Dependencies):
    - django (external library / framework)
    - rest_framework (external library / framework)
    - rest_framework_simplejwt (external library / framework)

Original Module Notes:
    Secure JWT and Session Authentication with Session Versioning & Account Status Checks.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model

User = get_user_model()


class RoomSwapJWTAuthentication(JWTAuthentication):
    """
    Enhanced JWT Authentication enforcing account status (ACTIVE/SUSPENDED/REVOKED)
    and immediate session revocation via session_version verification.
    """
    def get_user(self, validated_token):
        user = super().get_user(validated_token)

        if not user.is_active:
            raise AuthenticationFailed('User account is inactive.', code='user_inactive')

        account_status = getattr(user, 'account_status', 'ACTIVE')
        if account_status == 'SUSPENDED':
            raise AuthenticationFailed('User account has been suspended by administration.', code='account_suspended')
        if account_status == 'REVOKED':
            raise AuthenticationFailed('User account access has been revoked.', code='account_revoked')

        token_session_version = validated_token.get('session_version')
        if token_session_version is not None and token_session_version != user.session_version:
            raise AuthenticationFailed('Session has expired or was revoked. Please sign in again.', code='session_revoked')

        return user


def get_tokens_for_user(user):
    """Generate refresh and access tokens with embedded session_version and role claims."""
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    refresh['session_version'] = user.session_version
    refresh['role'] = user.role
    refresh.access_token['session_version'] = user.session_version
    refresh.access_token['role'] = user.role
    return refresh


try:
    from drf_spectacular.extensions import OpenApiAuthenticationExtension
    from drf_spectacular.plumbing import build_bearer_security_scheme_object

    class RoomSwapJWTScheme(OpenApiAuthenticationExtension):
        """Registers RoomSwapJWTAuthentication as a Bearer JWT scheme for drf-spectacular."""

        target_class = 'apps.accounts.authentication.RoomSwapJWTAuthentication'
        name = 'BearerAuth'

        def get_security_definition(self, auto_schema):
            return build_bearer_security_scheme_object(
                header_name='Authorization',
                token_prefix='Bearer',
                bearer_format='JWT',
            )
except ImportError:
    pass
