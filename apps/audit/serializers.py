from rest_framework import serializers

from apps.audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor",
            "action",
            "timestamp",
            "business",
            "location",
            "target",
            "resource",
            "event_type",
            "outcome",
        ]
        read_only_fields = fields
