import pytest

from apps.security.tests.conftest import client_for

pytestmark = pytest.mark.django_db

MONITORING = "/api/v1/admin/monitoring/"
MONITORING_HEALTH = "/api/v1/admin/monitoring/health/"

# Operational/health signals that MUST be representable.
EXPECTED_HEALTH_FIELDS = {"status", "application", "database", "dependencies"}
# Business-analytics keys that MUST NEVER appear in operational monitoring.
FORBIDDEN_ANALYTICS_KEYS = {
    "sales",
    "revenue",
    "omzet",
    "inventory",
    "profit",
    "laba",
    "hpp",
    "customer_count",
    "best_selling",
}


class TestPart26MonitoringCapability:
    def test_m1_application_health_exists(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(MONITORING_HEALTH)
        assert resp.status_code == 200

    def test_m2_database_health_represented(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(MONITORING_HEALTH)
        assert resp.status_code == 200
        payload = resp.json()
        assert "database" in payload

    def test_m3_dependency_health_represented(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(MONITORING_HEALTH)
        assert resp.status_code == 200
        payload = resp.json()
        assert "dependencies" in payload

    def test_m4_operational_error_signals_represented(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(MONITORING)
        assert resp.status_code == 200
        payload = resp.json()
        assert EXPECTED_HEALTH_FIELDS.issubset(set(payload.keys()))


class TestPart26MonitoringNotAnalytics:
    def test_m5_not_business_analytics(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(MONITORING)
        assert resp.status_code == 200
        payload = resp.json()
        blob = str(payload).lower()
        for key in FORBIDDEN_ANALYTICS_KEYS:
            assert key not in blob

    def test_m6_no_sales_revenue_inventory_exposure(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(MONITORING_HEALTH)
        assert resp.status_code == 200
        payload = resp.json()
        blob = str(payload).lower()
        for key in ("sales", "revenue", "inventory", "omzet", "laba"):
            assert key not in blob


class TestPart26MonitoringAuthBoundary:
    def test_m7_owner_cannot_access_platform_monitoring(self, owner1, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).get(MONITORING)
        assert resp.status_code == 403

    def test_m8_cross_business_requires_superadmin(
        self, owner1, owner1_tokens, superuser, super_tokens
    ):
        owner_resp = client_for(owner1_tokens["access"]).get(MONITORING)
        assert owner_resp.status_code == 403
        super_resp = client_for(super_tokens["access"]).get(MONITORING)
        assert super_resp.status_code == 200

    def test_m_unauthenticated_401(self, api_client):
        resp = api_client.get(MONITORING)
        assert resp.status_code == 401
