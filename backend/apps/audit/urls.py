"""URL routes for audit."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'admin/audit-logs', views.AuditEntryViewSet, basename='audit-log')

urlpatterns = [
    path('', include(router.urls)),
]
