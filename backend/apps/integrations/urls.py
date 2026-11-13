"""
Module: backend/apps/integrations/urls.py

Work / Purpose:
    URL routing table registering REST API endpoints exposed by apps.integrations.

Connected Modules (Used By / Routes):
    - backend/config/urls.py
    - backend/config/urls.py (included under /api/v1/)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/integrations/__init__.py
    - backend/apps/integrations/views.py
    - django (external library / framework)
"""

from django.urls import path
from . import views

urlpatterns = [
    path('admin/integrations/p03/sync/', views.p03_sync_view, name='admin-p03-sync'),
    path('admin/integrations/status/', views.integrations_status_view, name='admin-integrations-status'),
    path('admin/integrations/email/test/', views.test_email_dispatch_view, name='admin-email-test'),
    path('admin/integrations/sync/trigger/', views.trigger_data_sync_view, name='admin-data-sync-trigger'),
    path('admin/integrations/logs/', views.integrations_logs_view, name='admin-integrations-logs'),
]
