"""
Module: backend/apps/notifications/apps.py

Work / Purpose:
    Django AppConfig registration (NotificationsConfig) for the apps.notifications domain app.

Connected Modules (Used By / Routes):
    - backend/apps/notifications/__init__.py
    - backend/config/settings.py (INSTALLED_APPS -> apps.notifications)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/notifications/__init__.py
    - django (external library / framework)
"""

from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.notifications'
    verbose_name = 'Notifications'
