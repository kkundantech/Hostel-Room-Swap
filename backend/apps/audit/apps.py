"""
Module: backend/apps/audit/apps.py

Work / Purpose:
    Django AppConfig registration (AuditConfig) for the apps.audit domain app.

Connected Modules (Used By / Routes):
    - backend/apps/audit/__init__.py
    - backend/config/settings.py (INSTALLED_APPS -> apps.audit)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/audit/__init__.py
    - django (external library / framework)
"""

from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.audit'
    verbose_name = 'Audit Trail'
