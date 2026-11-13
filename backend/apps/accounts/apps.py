"""
Module: backend/apps/accounts/apps.py

Work / Purpose:
    Django AppConfig registration (AccountsConfig) for the apps.accounts domain app.

Connected Modules (Used By / Routes):
    - backend/apps/accounts/__init__.py
    - backend/config/settings.py (INSTALLED_APPS -> apps.accounts)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/__init__.py
    - django (external library / framework)
"""

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.accounts'
    verbose_name = 'Accounts & Authentication'

    def ready(self):
        pass  # Import signals here if needed
