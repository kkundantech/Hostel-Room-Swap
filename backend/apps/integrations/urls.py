from django.urls import path
from . import views

urlpatterns = [
    path('admin/integrations/p03/sync/', views.p03_sync_view, name='admin-p03-sync'),
    path('admin/integrations/status/', views.integrations_status_view, name='admin-integrations-status'),
    path('admin/integrations/email/test/', views.test_email_dispatch_view, name='admin-email-test'),
    path('admin/integrations/sync/trigger/', views.trigger_data_sync_view, name='admin-data-sync-trigger'),
    path('admin/integrations/logs/', views.integrations_logs_view, name='admin-integrations-logs'),
]
