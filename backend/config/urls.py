"""
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
    """Simple health check endpoint."""
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return JsonResponse({
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
        "version": "1.0.0",
    })


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
