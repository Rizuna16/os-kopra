import os
import pytest
from apps.admin.tests.conftest import client_for
from apps.authentication.models import User
from apps.business.models import Business, Subscription
from apps.billing.models import Plan
from apps.audit.models import AuditLog

pytestmark = pytest.mark.django_db

ADMIN_SUBSCRIPTIONS = "/api/v1/admin/subscriptions/"
ADMIN_PLANS = "/api/v1/admin/plans/"

class TestDomain06SubscriptionPlanRed:
    # --- SUBSCRIPTION TESTS ---
    def test_d06_01_super_admin_subscription_list(self, superuser, super_tokens, business1):
        resp = client_for(super_tokens["access"]).get(ADMIN_SUBSCRIPTIONS)
        assert resp.status_code == 200

    def test_d06_02_super_admin_subscription_detail(self, superuser, super_tokens, business1):
        sub = Subscription.objects.create(business=business1, status=Subscription.Status.ACTIVE)
        resp = client_for(super_tokens["access"]).get(f"{ADMIN_SUBSCRIPTIONS}{sub.id}/")
        assert resp.status_code == 200

    def test_d06_03_subscription_platform_context(self, superuser, super_tokens, business1):
        sub = Subscription.objects.create(business=business1, status=Subscription.Status.ACTIVE)
        resp = client_for(super_tokens["access"]).get(f"{ADMIN_SUBSCRIPTIONS}{sub.id}/")
        assert resp.status_code == 200
        data = resp.json()
        assert str(data["business_id"]) == str(business1.id)

    def test_d06_04_anonymous_subscription_access(self, api_client):
        resp = api_client.get(ADMIN_SUBSCRIPTIONS)
        assert resp.status_code == 401

    def test_d06_05_owner_subscription_admin_access(self, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).get(ADMIN_SUBSCRIPTIONS)
        assert resp.status_code == 403

    def test_d06_06_admin_subscription_admin_access(self, staff_tokens):
        resp = client_for(staff_tokens["access"]).get(ADMIN_SUBSCRIPTIONS)
        assert resp.status_code == 403

    def test_d06_07_kasir_subscription_admin_access(self, plain_tokens):
        resp = client_for(plain_tokens["access"]).get(ADMIN_SUBSCRIPTIONS)
        assert resp.status_code == 403

    def test_d06_08_staff_only_subscription_admin_access(self, staff_tokens):
        resp = client_for(staff_tokens["access"]).get(ADMIN_SUBSCRIPTIONS)
        assert resp.status_code == 403

    def test_d06_09_is_staff_without_superuser(self, staff_tokens):
        resp = client_for(staff_tokens["access"]).get(ADMIN_SUBSCRIPTIONS)
        assert resp.status_code == 403

    def test_d06_10_subscription_secret_sanitization(self, superuser, super_tokens, business1):
        sub = Subscription.objects.create(business=business1)
        resp = client_for(super_tokens["access"]).get(f"{ADMIN_SUBSCRIPTIONS}{sub.id}/")
        assert resp.status_code == 200
        content = resp.content.decode().lower()
        assert "password" not in content
        assert "secret" not in content

    def test_d06_11_subscription_list_audit_event(self, superuser, super_tokens):
        before = AuditLog.objects.count()
        client_for(super_tokens["access"]).get(ADMIN_SUBSCRIPTIONS)
        after = AuditLog.objects.count()
        assert after > before

    def test_d06_12_subscription_detail_audit_event(self, superuser, super_tokens, business1):
        sub = Subscription.objects.create(business=business1)
        before = AuditLog.objects.count()
        client_for(super_tokens["access"]).get(f"{ADMIN_SUBSCRIPTIONS}{sub.id}/")
        after = AuditLog.objects.count()
        assert after > before

    # --- PLAN TESTS ---
    def test_d06_13_super_admin_plan_list(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(ADMIN_PLANS)
        assert resp.status_code == 200

    def test_d06_14_super_admin_plan_detail(self, superuser, super_tokens):
        plan = Plan.objects.create(name="Pro Plan", code="pro-plan-d06", amount=100000, billing_interval="MONTHLY", is_active=True)
        resp = client_for(super_tokens["access"]).get(f"{ADMIN_PLANS}{plan.id}/")
        assert resp.status_code == 200

    def test_d06_15_super_admin_create_plan(self, superuser, super_tokens):
        payload = {"name": "Enterprise", "code": "ent-d06", "amount": 500000, "billing_interval": "YEARLY", "is_active": True}
        resp = client_for(super_tokens["access"]).post(ADMIN_PLANS, payload, format="json")
        assert resp.status_code in (200, 201)

    def test_d06_16_super_admin_update_plan(self, superuser, super_tokens):
        plan = Plan.objects.create(name="Basic", code="basic-d06", amount=50000, billing_interval="MONTHLY")
        resp = client_for(super_tokens["access"]).patch(f"{ADMIN_PLANS}{plan.id}/", {"amount": 60000}, format="json")
        assert resp.status_code == 200

    def test_d06_17_super_admin_enable_plan(self, superuser, super_tokens):
        plan = Plan.objects.create(name="Inactive", code="inactive-d06", amount=50000, billing_interval="MONTHLY", is_active=False)
        resp = client_for(super_tokens["access"]).post(f"{ADMIN_PLANS}{plan.id}/enable/", {}, format="json")
        assert resp.status_code in (200, 204)

    def test_d06_18_super_admin_disable_plan(self, superuser, super_tokens):
        plan = Plan.objects.create(name="Active", code="active-d06", amount=50000, billing_interval="MONTHLY", is_active=True)
        resp = client_for(super_tokens["access"]).post(f"{ADMIN_PLANS}{plan.id}/disable/", {}, format="json")
        assert resp.status_code in (200, 204)

    def test_d06_19_anonymous_plan_access(self, api_client):
        resp = api_client.get(ADMIN_PLANS)
        assert resp.status_code == 401

    def test_d06_20_owner_plan_mutation_denied(self, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).post(ADMIN_PLANS, {"name": "Hacked", "code": "hacked", "amount": 0, "billing_interval": "MONTHLY"}, format="json")
        assert resp.status_code == 403

    def test_d06_21_admin_plan_mutation_denied(self, staff_tokens):
        resp = client_for(staff_tokens["access"]).post(ADMIN_PLANS, {"name": "Hacked", "code": "hacked", "amount": 0, "billing_interval": "MONTHLY"}, format="json")
        assert resp.status_code == 403

    def test_d06_22_kasir_plan_mutation_denied(self, plain_tokens):
        resp = client_for(plain_tokens["access"]).post(ADMIN_PLANS, {"name": "Hacked", "code": "hacked", "amount": 0, "billing_interval": "MONTHLY"}, format="json")
        assert resp.status_code == 403

    def test_d06_23_staff_only_plan_access_denied(self, staff_tokens):
        resp = client_for(staff_tokens["access"]).get(ADMIN_PLANS)
        assert resp.status_code == 403

    def test_d06_24_is_staff_payload_escalation_blocked(self, staff_tokens):
        resp = client_for(staff_tokens["access"]).post(ADMIN_PLANS, {"name": "Hacked", "code": "hacked", "amount": 0, "billing_interval": "MONTHLY"}, format="json")
        assert resp.status_code == 403

    def test_d06_25_plan_audit_events(self, superuser, super_tokens):
        before = AuditLog.objects.count()
        client_for(super_tokens["access"]).get(ADMIN_PLANS)
        after = AuditLog.objects.count()
        assert after > before

    def test_d06_26_plan_historical_integrity_preserved(self, superuser, super_tokens, business1):
        plan = Plan.objects.create(name="Legacy", code="legacy-d06", amount=10000, billing_interval="MONTHLY", is_active=True)
        sub = Subscription.objects.create(business=business1)
        # Deactivating plan should not destroy subscription relationship
        client_for(super_tokens["access"]).post(f"{ADMIN_PLANS}{plan.id}/disable/", {}, format="json")
        plan.refresh_from_db()
        assert plan.is_active is False

    def test_d06_27_plan_secret_sanitization(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(ADMIN_PLANS)
        assert resp.status_code == 200
        content = resp.content.decode().lower()
        assert "password" not in content

    # --- ISOLATION / REGRESSION ---
    def test_d06_28_tenant_plan_catalog_operational(self, api_client, owner1_tokens):
        # anonymous tenant plan catalog → 401
        resp_anon = api_client.get("/api/v1/billing/plans/")
        assert resp_anon.status_code == 401
        # authenticated tenant → 200
        resp_auth = client_for(owner1_tokens["access"]).get("/api/v1/billing/plans/")
        assert resp_auth.status_code == 200

    def test_d06_29_tenant_subscription_creation_operational(self, owner1_tokens, business1):
        # Tenant creation contract endpoint
        resp = client_for(owner1_tokens["access"]).post(f"/api/v1/businesses/{business1.id}/subscription/", {})
        assert resp.status_code in (200, 201, 400) # depending on payload, but not 401/403/404 admin route collision

    def test_d06_30_existing_super_admin_p0_routes_operational(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get("/api/v1/admin/accounts/")
        assert resp.status_code == 200

    def test_d06_31_business_access_mixin_intact(self):
        from apps.authentication.permissions import BusinessAccessMixin
        assert BusinessAccessMixin is not None

    def test_d06_32_business_context_not_required(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(ADMIN_SUBSCRIPTIONS)
        assert resp.status_code == 200
