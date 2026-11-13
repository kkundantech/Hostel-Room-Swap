"""
Module: backend/apps/transfers/apps.py

Work / Purpose:
    Django AppConfig registration (TransfersConfig) for the apps.transfers domain app.

Connected Modules (Used By / Routes):
    - backend/apps/transfers/__init__.py
    - backend/config/settings.py (INSTALLED_APPS -> apps.transfers)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/transfers/__init__.py
    - django (external library / framework)
"""

from django.apps import AppConfig


class TransfersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.transfers'
    verbose_name = 'Transfer Records'
