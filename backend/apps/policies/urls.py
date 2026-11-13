"""
Module: backend/apps/policies/urls.py

Work / Purpose:
    URL routing table registering REST API endpoints exposed by apps.policies.

Connected Modules (Used By / Routes):
    - backend/config/urls.py
    - backend/config/urls.py (included under /api/v1/)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/policies/__init__.py
    - backend/apps/policies/views.py
    - django (external library / framework)
    - rest_framework (external library / framework)
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'admin/policies', views.PolicyRuleViewSet, basename='policy-rule')
router.register(r'policies', views.PolicyRuleViewSet, basename='policy')

urlpatterns = [path('', include(router.urls))]
