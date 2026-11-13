"""
Module: backend/apps/proposals/urls.py

Work / Purpose:
    URL routing table registering REST API endpoints exposed by apps.proposals.

Connected Modules (Used By / Routes):
    - backend/config/urls.py
    - backend/config/urls.py (included under /api/v1/)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/proposals/__init__.py
    - backend/apps/proposals/views.py
    - django (external library / framework)
    - rest_framework (external library / framework)
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'proposals', views.ExchangeProposalViewSet, basename='proposal')

urlpatterns = [path('', include(router.urls))]
