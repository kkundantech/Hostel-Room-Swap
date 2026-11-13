"""
Module: backend/config/urls.py

Work / Purpose:
    Root Django URL router exposing /api/health/, Swagger/ReDoc OpenAPI docs, Django admin, and all /api/v1/ app routes.

Connected Modules (Used By / Routes):
    - Django HTTP request dispatcher (ROOT_URLCONF in backend/config/settings.py)
    - backend/config/settings.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/urls.py
    - backend/apps/analytics/urls.py
    - backend/apps/approvals/urls.py
    - backend/apps/audit/urls.py
    - backend/apps/exchange_requests/urls.py
    - backend/apps/hostels/urls.py
    - backend/apps/integrations/urls.py
    - backend/apps/matching/urls.py
    - backend/apps/notifications/urls.py
    - backend/apps/policies/urls.py
    - backend/apps/proposals/urls.py
    - backend/apps/transfers/urls.py
    - django (external library / framework)
    - drf_spectacular (external library / framework)

Original Module Notes:
    URL configuration for Hostel Room Exchange Platform.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

# Health check view
from django.http import JsonResponse


def health_check(request):
    """Production health check endpoint verifying PostgreSQL connectivity."""
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)}" if settings.DEBUG else "unavailable"

    is_healthy = db_status == "ok"
    return JsonResponse(
        {
            "status": "ok" if is_healthy else "degraded",
            "database": db_status,
            "version": "1.0.0",
        },
        status=200 if is_healthy else 503,
    )


urlpatterns = [
    # Django admin
    path('admin/', admin.site.urls),

    # Health check
    path('api/health/', health_check, name='health-check'),

    # OpenAPI / Swagger
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # API v1 & Root API endpoints
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/accounts/', include('apps.accounts.urls')),
    path('api/v1/', include('apps.accounts.urls')),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/', include('apps.accounts.urls')),
    path('api/v1/', include('apps.hostels.urls')),
    path('api/v1/', include('apps.exchange_requests.urls')),
    path('api/v1/', include('apps.matching.urls')),
    path('api/v1/', include('apps.proposals.urls')),
    path('api/v1/', include('apps.approvals.urls')),
    path('api/v1/', include('apps.transfers.urls')),
    path('api/v1/', include('apps.policies.urls')),
    path('api/v1/', include('apps.notifications.urls')),
    path('api/v1/', include('apps.analytics.urls')),
    path('api/v1/', include('apps.audit.urls')),
    path('api/v1/', include('apps.integrations.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
