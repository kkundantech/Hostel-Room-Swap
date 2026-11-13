"""
Module: backend/apps/approvals/apps.py

Work / Purpose:
    Django AppConfig registration (ApprovalsConfig) for the apps.approvals domain app.

Connected Modules (Used By / Routes):
    - backend/apps/approvals/__init__.py
    - backend/config/settings.py (INSTALLED_APPS -> apps.approvals)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/approvals/__init__.py
    - django (external library / framework)
"""

from django.apps import AppConfig


class ApprovalsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.approvals'
    verbose_name = 'Approval Workflow'
