"""
Audit logging service.

Provides a simple interface for logging audit events from anywhere
in the application.
"""
import logging
from .models import AuditEntry

logger = logging.getLogger(__name__)


def log_audit_event(
    user=None,
    action='DATA_MODIFIED',
    description='',
    target_type='',
    target_id=None,
    request=None,
    extra_data=None,
):
    """
    Create an audit entry.

    Args:
        user: The user performing the action (can be None for system actions).
        action: AuditEntry.Action value.
        description: Human-readable description.
        target_type: Model name of the affected object.
        target_id: PK of the affected object.
        request: HTTP request object (for IP/user-agent).
        extra_data: Additional JSON-serializable context.
    """
    ip_address = None
    user_agent = ''

    if request:
        ip_address = _get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]

    try:
        entry = AuditEntry.objects.create(
            user=user,
            action=action,
            description=description,
            target_type=target_type,
            target_id=target_id,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra_data or {},
        )
        return entry
    except Exception as e:
        # Audit logging should never break the main flow
        logger.error(f"Failed to create audit entry: {e}")
        return None


def _get_client_ip(request):
    """Extract client IP from request, considering proxy headers."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')
