from rest_framework import serializers

from apps.backup.models import Backup


class BackupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Backup
        fields = [
            "id",
            "triggered_by",
            "created_at",
            "status",
            "integrity",
            "verified",
            "restored_at",
            "notes",
        ]
        read_only_fields = fields
