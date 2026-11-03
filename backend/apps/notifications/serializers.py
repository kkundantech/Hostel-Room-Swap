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
