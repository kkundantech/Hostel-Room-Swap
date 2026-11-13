"""
Module: backend/config/wsgi.py

Work / Purpose:
    Exposes the WSGI application callable for Gunicorn and synchronous production deployment.

Connected Modules (Used By / Routes):
    - Gunicorn / WSGI HTTP server entrypoint
    - backend/config/settings.py

Helpful / Supporting Modules (Dependencies):
    - backend/config/settings.py
    - django (external library / framework)

Original Module Notes:
    WSGI config for Hostel Room Exchange Platform.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
application = get_wsgi_application()
