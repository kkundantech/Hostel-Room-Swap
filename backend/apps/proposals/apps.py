"""
Module: backend/apps/proposals/apps.py

Work / Purpose:
    Django AppConfig registration (ProposalsConfig) for the apps.proposals domain app.

Connected Modules (Used By / Routes):
    - backend/apps/proposals/__init__.py
    - backend/config/settings.py (INSTALLED_APPS -> apps.proposals)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/proposals/__init__.py
    - django (external library / framework)
"""

from django.apps import AppConfig


class ProposalsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.proposals'
    verbose_name = 'Exchange Proposals'
