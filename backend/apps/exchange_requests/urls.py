"""
Module: backend/apps/exchange_requests/urls.py

Work / Purpose:
    URL routing table registering REST API endpoints exposed by apps.exchange_requests.

Connected Modules (Used By / Routes):
    - backend/config/urls.py
    - backend/config/urls.py (included under /api/v1/)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/exchange_requests/__init__.py
    - backend/apps/exchange_requests/views.py
    - django (external library / framework)
    - rest_framework (external library / framework)
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'exchange-requests', views.ExchangeRequestViewSet, basename='exchange-request')
router.register(r'requests', views.ExchangeRequestViewSet, basename='request')

urlpatterns = [path('', include(router.urls))]
