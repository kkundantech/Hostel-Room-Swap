"""
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
