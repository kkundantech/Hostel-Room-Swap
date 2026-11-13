"""
Module: backend/apps/notifications/serializers.py

Work / Purpose:
    Serializes Notification records for student, warden, and admin notification feeds.

Connected Modules (Used By / Routes):
    - backend/apps/notifications/views.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/notifications/models.py
    - rest_framework (external library / framework)
"""

from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'notif_type', 'title', 'message', 'is_read',
            'read_at', 'related_type', 'related_id', 'created_at',
        ]
        read_only_fields = fields
