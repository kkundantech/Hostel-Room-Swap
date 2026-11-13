"""
Module: backend/apps/matching/apps.py

Work / Purpose:
    Django AppConfig registration (MatchingConfig) for the apps.matching domain app.

Connected Modules (Used By / Routes):
    - backend/apps/matching/__init__.py
    - backend/config/settings.py (INSTALLED_APPS -> apps.matching)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/matching/__init__.py
    - django (external library / framework)
"""

from django.apps import AppConfig


class MatchingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.matching'
    verbose_name = 'Matching Engine'
