"""
Module: backend/config/celery.py

Work / Purpose:
    Configures the Celery task queue, Redis broker/backend autodiscovery, and scheduled Beat jobs.

Connected Modules (Used By / Routes):
    - Celery worker & Celery Beat scheduler processes

Helpful / Supporting Modules (Dependencies):
    - backend/config/settings.py
    - celery (external library / framework)

Original Module Notes:
    Celery configuration for Hostel Room Exchange Platform.
"""
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('hostel_exchange')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task to verify Celery is working."""
    print(f'Request: {self.request!r}')
