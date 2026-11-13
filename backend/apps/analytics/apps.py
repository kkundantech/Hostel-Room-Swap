"""
Module: backend/apps/analytics/apps.py

Work / Purpose:
    Django AppConfig registration (AnalyticsConfig) for the apps.analytics domain app.

Connected Modules (Used By / Routes):
    - backend/apps/analytics/__init__.py
    - backend/config/settings.py (INSTALLED_APPS -> apps.analytics)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/analytics/__init__.py
    - django (external library / framework)
"""

from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.analytics'
    verbose_name = 'Analytics & Reports'
