from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admin.permissions import IsSuperAdmin
from apps.audit.models import AuditLog
from apps.audit.serializers import AuditLogSerializer


class AuditLogListView(APIView):
    """Super-admin platform-wide audit read surface (cross-business = super-admin only)."""

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        logs = AuditLog.objects.all().order_by("-timestamp")
        return Response(AuditLogSerializer(logs, many=True).data)


class AuditLogDetailView(APIView):
    """Read-only audit detail. No mutation endpoints (append-only contract)."""

    permission_classes = [IsSuperAdmin]

    def get(self, request, pk):
        log = AuditLog.objects.filter(pk=pk).first()
        if log is None:
            return Response({"detail": "Not found."}, status=404)
        return Response(AuditLogSerializer(log).data)
