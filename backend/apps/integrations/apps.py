"""
Module: backend/apps/integrations/apps.py

Work / Purpose:
    Django AppConfig registration (IntegrationsConfig) for the apps.integrations domain app.

Connected Modules (Used By / Routes):
    - backend/apps/integrations/__init__.py
    - backend/config/settings.py (INSTALLED_APPS -> apps.integrations)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/integrations/__init__.py
    - django (external library / framework)
"""

from django.apps import AppConfig


class IntegrationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.integrations'
    verbose_name = 'External Integrations'
