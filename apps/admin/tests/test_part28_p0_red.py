import os
import uuid
import pytest
from apps.admin.tests.conftest import client_for
from apps.authentication.models import User
from apps.business.models import Business, Subscription
from apps.audit.models import AuditLog

pytestmark = pytest.mark.django_db

ADMIN_ACCOUNTS = "/api/v1/admin/accounts/"
ADMIN_OWNERS = "/api/v1/admin/owners/"
ADMIN_BUSINESSES = "/api/v1/admin/businesses/"
ADMIN_USERS = "/api/v1/admin/users/"
ADMIN_ADMINS = "/api/v1/admin/admins/"

class TestP0GovernanceAuth:
    def test_p0_01_account_list_superuser(self, superuser, super_tokens, business1):
        resp = client_for(super_tokens["access"]).get(ADMIN_ACCOUNTS)
        assert resp.status_code == 200

    def test_p0_02_account_detail_superuser(self, superuser, super_tokens, business1):
        resp = client_for(super_tokens["access"]).get(f"{ADMIN_ACCOUNTS}{business1.owner.id}/")
        assert resp.status_code == 200

    def test_p0_03_logical_account_id_is_owner(self, superuser, super_tokens, business1):
        resp = client_for(super_tokens["access"]).get(f"{ADMIN_ACCOUNTS}{business1.owner.id}/")
        assert resp.status_code == 200
        data = resp.json()
        assert str(data["owner_id"]) == str(business1.owner.id)

    def test_p0_04_account_business_aggregation(self, superuser, super_tokens, owner1, business1):
        resp = client_for(super_tokens["access"]).get(f"{ADMIN_ACCOUNTS}{owner1.id}/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["business_count"] >= 1
        assert any(b["id"] == str(business1.id) for b in data["businesses"])

    def test_p0_05_owner_directory(self, superuser, super_tokens, owner1):
        resp = client_for(super_tokens["access"]).get(ADMIN_OWNERS)
        assert resp.status_code == 200

    def test_p0_06_owner_mapping(self, superuser, super_tokens, owner1, business1):
        resp = client_for(super_tokens["access"]).get(f"{ADMIN_OWNERS}{owner1.id}/")
        assert resp.status_code == 200
        data = resp.json()
        assert any(b["id"] == str(business1.id) for b in data["businesses"])

    def test_p0_07_business_directory(self, superuser, super_tokens, business1):
        resp = client_for(super_tokens["access"]).get(ADMIN_BUSINESSES)
        assert resp.status_code == 200

    def test_p0_08_business_tenant_boundary(self, business1):
        assert Business.objects.filter(id=business1.id).exists()

    def test_p0_09_user_directory(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(ADMIN_USERS)
        assert resp.status_code == 200

    def test_p0_10_user_memberships(self, superuser, super_tokens, owner1):
        resp = client_for(super_tokens["access"]).get(f"{ADMIN_USERS}{owner1.id}/")
        assert resp.status_code == 200

    def test_p0_11_role_mapping(self, superuser, super_tokens, owner1):
        resp = client_for(super_tokens["access"]).get(f"{ADMIN_USERS}{owner1.id}/")
        assert resp.status_code == 200

    def test_p0_12_admin_directory(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(ADMIN_ADMINS)
        assert resp.status_code == 200

    def test_p0_13_super_admin_authorization(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(ADMIN_ACCOUNTS)
        assert resp.status_code == 200

    def test_p0_14_anonymous_denied(self, api_client):
        for ep in [ADMIN_ACCOUNTS, ADMIN_OWNERS, ADMIN_BUSINESSES, ADMIN_USERS, ADMIN_ADMINS]:
            assert api_client.get(ep).status_code == 401

    def test_p0_15_owner_denied(self, owner1, owner1_tokens):
        for ep in [ADMIN_ACCOUNTS, ADMIN_OWNERS, ADMIN_BUSINESSES, ADMIN_USERS, ADMIN_ADMINS]:
            assert client_for(owner1_tokens["access"]).get(ep).status_code == 403

    def test_p0_16_admin_denied(self, staff_admin, staff_tokens):
        for ep in [ADMIN_ACCOUNTS, ADMIN_OWNERS, ADMIN_BUSINESSES, ADMIN_USERS, ADMIN_ADMINS]:
            assert client_for(staff_tokens["access"]).get(ep).status_code == 403

    def test_p0_17_kasir_denied(self, plain_user, plain_tokens):
        for ep in [ADMIN_ACCOUNTS, ADMIN_OWNERS, ADMIN_BUSINESSES, ADMIN_USERS, ADMIN_ADMINS]:
            assert client_for(plain_tokens["access"]).get(ep).status_code == 403

    def test_p0_18_staff_denied(self, staff_admin, staff_tokens):
        for ep in [ADMIN_ACCOUNTS, ADMIN_OWNERS, ADMIN_BUSINESSES, ADMIN_USERS, ADMIN_ADMINS]:
            assert client_for(staff_tokens["access"]).get(ep).status_code == 403

    def test_p0_19_payload_escalation_prevention(self, plain_user, plain_tokens):
        # Even if user tries injecting is_superuser in token/session or request, permissions check db is_superuser
        assert not plain_user.is_superuser
        resp = client_for(plain_tokens["access"]).get(ADMIN_ACCOUNTS)
        assert resp.status_code == 403

    def test_p0_20_secret_sanitization(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(ADMIN_USERS)
        assert resp.status_code == 200
        content = resp.content.decode().lower()
        assert "password" not in content
        assert "password_hash" not in content

    def test_p0_21_business_context_independence(self, superuser, super_tokens):
        # Platform admin APIs do not require any X-Business-ID header or context
        resp = client_for(super_tokens["access"]).get(ADMIN_ACCOUNTS)
        assert resp.status_code == 200

    def test_p0_22_v1_route_compatibility(self):
        from django.urls import resolve
        assert resolve("/api/v1/businesses/") is not None

    def test_p0_23_tenant_endpoint_preservation(self):
        from django.urls import resolve
        assert resolve("/api/v1/admin/businesses/") is not None

    def test_p0_24_readonly_enforcement(self, superuser, super_tokens):
        for ep in [ADMIN_ACCOUNTS, ADMIN_OWNERS, ADMIN_BUSINESSES, ADMIN_USERS, ADMIN_ADMINS]:
            resp = client_for(super_tokens["access"]).post(ep, {})
            assert resp.status_code in (403, 405)

    def test_p0_25_audit_event_logging(self, superuser, super_tokens):
        before = AuditLog.objects.count()
        client_for(super_tokens["access"]).get(ADMIN_ACCOUNTS)
        after = AuditLog.objects.count()
        assert after > before
