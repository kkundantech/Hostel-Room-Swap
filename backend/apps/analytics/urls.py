from django.urls import path
from . import views

urlpatterns = [
    path('admin/analytics/', views.dashboard_analytics, name='admin-analytics'),
    path('admin/analytics/trend/', views.exchange_volume_trend, name='analytics-trend'),
    path('admin/reports/', views.generate_admin_report, name='admin-reports'),
    path('admin/reports/export-csv/', views.export_report_csv_view, name='admin-reports-export-csv'),
]
