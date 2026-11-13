"""
Module: backend/apps/hostels/apps.py

Work / Purpose:
    Django AppConfig registration (HostelsConfig) for the apps.hostels domain app.

Connected Modules (Used By / Routes):
    - backend/apps/hostels/__init__.py
    - backend/config/settings.py (INSTALLED_APPS -> apps.hostels)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/hostels/__init__.py
    - django (external library / framework)
"""

from django.apps import AppConfig


class HostelsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.hostels'
    verbose_name = 'Hostels & Occupancy'
