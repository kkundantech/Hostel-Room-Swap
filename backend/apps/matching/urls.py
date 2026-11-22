"""
Module: backend/apps/matching/urls.py

Work / Purpose:
    URL routing table registering REST API endpoints exposed by apps.matching.

Connected Modules (Used By / Routes):
    - backend/config/urls.py
    - backend/config/urls.py (included under /api/v1/)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/matching/__init__.py
    - backend/apps/matching/views.py
    - django (external library / framework)
"""

from django.urls import path
from . import views

urlpatterns = [
    path('matches/', views.matching_status_view, name='match-status'),
    path('matches/run/', views.run_matching_view, name='match-run'),
    path('matching/status/', views.matching_status_view, name='matching-status-alias'),
    path('matching/preview/', views.matching_status_view, name='matching-preview'),
    path('matching/run/', views.run_matching_view, name='matching-run-alias'),
]
