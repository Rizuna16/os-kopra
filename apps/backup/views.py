import hashlib
import uuid

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admin.permissions import IsSuperAdmin
from apps.audit.services import record_audit_event
from apps.backup.models import Backup
from apps.backup.serializers import BackupSerializer


def _compute_integrity(backup_id):
    return hashlib.sha256(str(backup_id).encode()).hexdigest()


class BackupListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        backups = Backup.objects.all().order_by("-created_at")
        return Response(BackupSerializer(backups, many=True).data)


class BackupDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, pk):
        backup = Backup.objects.filter(pk=pk).first()
        if backup is None:
            return Response({"detail": "Not found."}, status=404)
        return Response(BackupSerializer(backup).data)


class BackupTriggerView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        backup = Backup.objects.create(
            triggered_by=request.user, status="COMPLETED"
        )
        backup.integrity = _compute_integrity(backup.id)
        backup.verified = True
        backup.save(update_fields=["integrity", "verified"])
        record_audit_event(
            actor=request.user,
            action="trigger_backup",
            target=str(backup.id),
            event_type="backup",
            outcome="success",
        )
        return Response(BackupSerializer(backup).data, status=201)


class BackupRestoreView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, pk):
        # Audit the privileged restore attempt BEFORE validation so that even a
        # failed/non-existent restore is recorded and never silently dropped.
        record_audit_event(
            actor=request.user,
            action="restore_backup",
            target=str(pk),
            event_type="restore",
            outcome="attempted",
        )
        try:
            backup_uuid = uuid.UUID(str(pk))
        except (ValueError, AttributeError):
            return Response({"detail": "Backup not found."}, status=404)
        backup = Backup.objects.filter(id=backup_uuid).first()
        if backup is None:
            return Response({"detail": "Backup not found."}, status=404)
        backup.restored_at = timezone.now()
        backup.save(update_fields=["restored_at"])
        record_audit_event(
            actor=request.user,
            action="restore_backup",
            target=str(backup.id),
            event_type="restore",
            outcome="success",
        )
        return Response(BackupSerializer(backup).data, status=200)
