"""
Module: backend/config/asgi.py

Work / Purpose:
    Exposes the ASGI application callable for async-capable production Python web servers.

Connected Modules (Used By / Routes):
    - ASGI async server entrypoint

Helpful / Supporting Modules (Dependencies):
    - backend/config/settings.py
    - django (external library / framework)

Original Module Notes:
    ASGI config for Hostel Room Exchange Platform.
"""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
application = get_asgi_application()
