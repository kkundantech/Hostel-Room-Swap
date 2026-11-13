"""
Module: backend/apps/accounts/exception_handler.py

Work / Purpose:
    Provides custom_exception_handler for standardized JSON API error envelopes across Django REST Framework views.

Connected Modules (Used By / Routes):
    - backend/config/settings.py

Helpful / Supporting Modules (Dependencies):
    - django (external library / framework)
    - rest_framework (external library / framework)

Original Module Notes:
    Custom exception handler for consistent API error responses.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import PermissionDenied
from django.http import Http404
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns consistent JSON error responses.
    """
    response = exception_handler(exc, context)

    if response is not None:
        custom_response = {
            'success': False,
            'status_code': response.status_code,
        }

        if isinstance(response.data, dict):
            custom_response['errors'] = response.data
        elif isinstance(response.data, list):
            custom_response['errors'] = {'detail': response.data}
        else:
            custom_response['errors'] = {'detail': str(response.data)}

        response.data = custom_response
    else:
        # Unhandled exceptions
        logger.exception(f"Unhandled exception in {context.get('view', 'unknown')}: {exc}")
        response = Response(
            {
                'success': False,
                'status_code': 500,
                'errors': {'detail': 'An unexpected error occurred.'},
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response
