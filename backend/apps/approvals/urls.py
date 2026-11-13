"""
Module: backend/apps/approvals/urls.py

Work / Purpose:
    URL routing table registering REST API endpoints exposed by apps.approvals.

Connected Modules (Used By / Routes):
    - backend/config/urls.py
    - backend/config/urls.py (included under /api/v1/)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/approvals/__init__.py
    - backend/apps/approvals/views.py
    - django (external library / framework)
    - rest_framework (external library / framework)
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'approvals', views.ProposalApprovalViewSet, basename='proposal-approval')
router.register(r'approval-records', views.ApprovalViewSet, basename='approval-record')

urlpatterns = [path('', include(router.urls))]
