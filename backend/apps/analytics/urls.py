"""
Module: backend/apps/analytics/urls.py

Work / Purpose:
    URL routing table registering REST API endpoints exposed by apps.analytics.

Connected Modules (Used By / Routes):
    - backend/config/urls.py
    - backend/config/urls.py (included under /api/v1/)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/analytics/__init__.py
    - backend/apps/analytics/views.py
    - django (external library / framework)
"""

from django.urls import path
from . import views

urlpatterns = [
    path('admin/analytics/', views.dashboard_analytics, name='admin-analytics'),
    path('admin/analytics/trend/', views.exchange_volume_trend, name='analytics-trend'),
    path('admin/reports/', views.generate_admin_report, name='admin-reports'),
    path('admin/reports/export-csv/', views.export_report_csv_view, name='admin-reports-export-csv'),
]
