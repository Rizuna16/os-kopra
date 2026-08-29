import pytest
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.models import User
from apps.business.models import Business, Subscription
from apps.audit.models import AuditLog

from apps.admin.tests.conftest import client_for

pytestmark = pytest.mark.django_db

ADMIN_DASHBOARD = "/api/v1/admin/dashboard/"

class TestDomain01DashboardRed:
    def test_d01_01_super_admin_dashboard_metrics(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(ADMIN_DASHBOARD)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert "total_accounts" in data
        assert "total_owners" in data
        assert "total_businesses" in data
        assert "total_users" in data
        assert "active_subscriptions" in data
        assert "revenue_summary" in data
        assert "system_status" in data

    def test_d01_02_anonymous_dashboard_access(self, api_client):
        resp = api_client.get(ADMIN_DASHBOARD)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_d01_03_owner_dashboard_access(self, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).get(ADMIN_DASHBOARD)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_d01_04_admin_dashboard_access(self, staff_tokens):
        resp = client_for(staff_tokens["access"]).get(ADMIN_DASHBOARD)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_d01_05_kasir_dashboard_access(self, plain_tokens):
        resp = client_for(plain_tokens["access"]).get(ADMIN_DASHBOARD)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_d01_06_dashboard_read_only_mutation_blocked(self, superuser, super_tokens):
        client = client_for(super_tokens["access"])
        resp = client.post(ADMIN_DASHBOARD, {}, format="json")
        assert resp.status_code in (status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_403_FORBIDDEN)

    def test_d01_07_dashboard_audit_event(self, superuser, super_tokens):
        before = AuditLog.objects.count()
        client_for(super_tokens["access"]).get(ADMIN_DASHBOARD)
        after = AuditLog.objects.count()
        assert after > before
