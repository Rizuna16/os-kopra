from django.db import connection

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admin.permissions import IsSuperAdmin


def _db_health():
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return {"status": "ok"}
    except Exception:
        return {"status": "error", "detail": "database unreachable"}


class MonitoringView(APIView):
    """Platform/operational monitoring only. NOT business analytics."""

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        db = _db_health()
        data = {
            "status": "ok",
            "application": {"status": "ok"},
            "database": db,
            "dependencies": [{"name": "postgresql", "status": db["status"]}],
            "signals": {"errors": 0},
        }
        return Response(data)


class HealthView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        db = _db_health()
        data = {
            "status": "ok",
            "database": db,
            "dependencies": [{"name": "postgresql", "status": db["status"]}],
        }
        return Response(data)
