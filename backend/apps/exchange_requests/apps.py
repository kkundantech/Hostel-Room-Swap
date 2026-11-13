"""
Module: backend/apps/exchange_requests/apps.py

Work / Purpose:
    Django AppConfig registration (ExchangeRequestsConfig) for the apps.exchange_requests domain app.

Connected Modules (Used By / Routes):
    - backend/apps/exchange_requests/__init__.py
    - backend/config/settings.py (INSTALLED_APPS -> apps.exchange_requests)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/exchange_requests/__init__.py
    - django (external library / framework)
"""

from django.apps import AppConfig


class ExchangeRequestsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.exchange_requests'
    verbose_name = 'Exchange Requests'
