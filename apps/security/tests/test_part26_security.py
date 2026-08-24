import pytest

from apps.security.tests.conftest import client_for

pytestmark = pytest.mark.django_db

# PART 26 platform capabilities live under the super-admin /api/v1/admin/ namespace
# (consistent with PART 25). Exact sub-paths are a GREEN decision; the namespace
# is fixed by Contract V1. Hitting a missing route yields 404 in RED.
AUDIT_LOGS = "/api/v1/admin/audit-logs/"
BACKUPS = "/api/v1/admin/backups/"
MONITORING = "/api/v1/admin/monitoring/"
MONITORING_HEALTH = "/api/v1/admin/monitoring/health/"

# Keys that must NEVER appear in any PART 26 response / audit / error payload.
FORBIDDEN_SECRET_KEYS = {
    "password",
    "token",
    "secret",
    "authorization",
    "api_key",
    "apikey",
    "access_token",
    "refresh_token",
    "signing_key",
    "server_key",
    "client_key",
}


class TestPart26SecurityAuthBoundary:
    # S1: existing JWT authentication remains required (preservation regression).
    def test_s1_existing_endpoint_requires_jwt(self, api_client):
        resp = api_client.get("/api/v1/businesses/")
        assert resp.status_code == 401

    # S2: unauthenticated access to protected PART 26 capability rejected.
    def test_s2_unauthenticated_audit_401(self, api_client):
        resp = api_client.get(AUDIT_LOGS)
        assert resp.status_code == 401

    def test_s2_unauthenticated_backup_401(self, api_client):
        resp = api_client.get(BACKUPS)
        assert resp.status_code == 401

    def test_s2_unauthenticated_monitoring_401(self, api_client):
        resp = api_client.get(MONITORING)
        assert resp.status_code == 401

    # S3: business/resource scope enforced for ordinary business users.
    def test_s3_owner_audit_403(self, owner1, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).get(AUDIT_LOGS)
        assert resp.status_code == 403

    def test_s3_owner_backup_403(self, owner1, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).get(BACKUPS)
        assert resp.status_code == 403

    def test_s3_owner_monitoring_403(self, owner1, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).get(MONITORING)
        assert resp.status_code == 403

    # S4: cross-business access rejected for ordinary business users.
    def test_s4_owner2_cannot_read_owner1_audit(self, owner2, owner2_tokens, business1):
        resp = client_for(owner2_tokens["access"]).get(AUDIT_LOGS)
        assert resp.status_code == 403

    # S5: Super Admin is the only role allowed platform-level capabilities.
    def test_s5_superuser_audit_200(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(AUDIT_LOGS)
        assert resp.status_code == 200

    def test_s5_superuser_backup_200(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(BACKUPS)
        assert resp.status_code == 200

    def test_s5_superuser_monitoring_200(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(MONITORING)
        assert resp.status_code == 200


class TestPart26SecurityIDOR:
    # S6: IDOR-style access to another Business's PART 26 data rejected.
    def test_s6_owner_idor_arbitrary_audit_uuid_403(self, owner1, owner1_tokens):
        import uuid

        resp = client_for(owner1_tokens["access"]).get(
            f"/api/v1/admin/audit-logs/{uuid.uuid4()}/"
        )
        assert resp.status_code == 403


class TestPart26SecurityExistingBoundaries:
    # S7: existing authentication throttling / security boundaries intact.
    def test_s7_login_throttle_still_configured(self):
        from apps.authentication.views import LoginView

        assert getattr(LoginView, "throttle_classes", []) != []

    def test_s7_existing_security_middleware_present(self):
        from django.conf import settings

        assert any(
            "SecurityMiddleware" in m for m in settings.MIDDLEWARE
        )
        assert any("CsrfViewMiddleware" in m for m in settings.MIDDLEWARE)


class TestPart26SecretLeak:
    # S8: secrets must never appear in API responses / audit / error output.
    def test_s8_existing_error_path_no_secret_leak(self, api_client):
        resp = api_client.get("/api/v1/businesses/")  # unauthenticated -> 401
        body = resp.content.decode().lower()
        assert "traceback" not in body
        for key in ("secret", "authorization", "password", "token"):
            assert key not in body

    def test_s8_audit_payload_no_secret(self, superuser, super_tokens):
        # When implemented, super-admin read succeeds and carries no secrets.
        resp = client_for(super_tokens["access"]).get(AUDIT_LOGS)
        assert resp.status_code == 200
        try:
            payload = resp.json()
        except ValueError:
            pytest.fail("Audit response is not valid JSON.")
        items = payload if isinstance(payload, list) else payload.get("results", [])
        blob = str(items).lower()
        for key in FORBIDDEN_SECRET_KEYS:
            assert key not in blob
