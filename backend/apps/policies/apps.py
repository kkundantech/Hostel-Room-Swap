"""
Module: backend/apps/policies/apps.py

Work / Purpose:
    Django AppConfig registration (PoliciesConfig) for the apps.policies domain app.

Connected Modules (Used By / Routes):
    - backend/apps/policies/__init__.py
    - backend/config/settings.py (INSTALLED_APPS -> apps.policies)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/policies/__init__.py
    - django (external library / framework)
"""

from django.apps import AppConfig


class PoliciesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.policies'
    verbose_name = 'Policy Rules'
