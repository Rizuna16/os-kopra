import os
import uuid

import pytest

from apps.admin.tests.conftest import client_for

pytestmark = pytest.mark.django_db

# Candidate PART 25 admin endpoint (under the locked /api/v1/admin/ namespace).
# The exact sub-path is a GREEN implementation decision; the namespace is fixed
# by Contract V1. Targeting a missing route yields 404 in RED.
ADMIN_BUSINESSES = "/api/v1/admin/businesses/"

# Contract V1 approved Business fields for admin platform visibility.
ALLOWED_BUSINESS_KEYS = {
    "id",
    "name",
    "status",
    "owner_id",
    "subscription_status",
}

# PII / sensitive keys that must NEVER appear in the admin payload.
FORBIDDEN_KEYS = {
    "email",
    "phone",
    "address",
    "first_name",
    "last_name",
    "password",
    "revenue",
    "amount",
    "balance",
}


class TestPart25AuthBoundary:
    # A1 ------------------------------------------------------------------
    def test_a1_unauthenticated_401(self, api_client):
        resp = api_client.get(ADMIN_BUSINESSES)
        assert resp.status_code == 401

    # A2 ------------------------------------------------------------------
    def test_a2_non_superuser_403(self, plain_user, plain_tokens):
        resp = client_for(plain_tokens["access"]).get(ADMIN_BUSINESSES)
        assert resp.status_code == 403

    # A3 ------------------------------------------------------------------
    def test_a3_owner_403(self, owner1, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).get(ADMIN_BUSINESSES)
        assert resp.status_code == 403

    # A4 ------------------------------------------------------------------
    def test_a4_admin_403(self, staff_admin, staff_tokens):
        # "ADMIN" principal (is_staff, not superuser) denied.
        resp = client_for(staff_tokens["access"]).get(ADMIN_BUSINESSES)
        assert resp.status_code == 403

    # A5 ------------------------------------------------------------------
    def test_a5_cashier_403(self, plain_user, plain_tokens):
        # "CASHIER"/non-owner non-superuser principal denied.
        resp = client_for(plain_tokens["access"]).get(ADMIN_BUSINESSES)
        assert resp.status_code == 403

    # A6 ------------------------------------------------------------------
    def test_a6_superuser_allowed(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(ADMIN_BUSINESSES)
        assert resp.status_code == 200


class TestPart25PlatformScope:
    def test_c_superadmin_sees_both_businesses(
        self, superuser, super_tokens, business1, business2
    ):
        resp = client_for(super_tokens["access"]).get(ADMIN_BUSINESSES)
        assert resp.status_code == 200
        body = resp.content.decode()
        assert business1.name in body
        assert business2.name in body

    def test_c_owner_denied_not_empty_scope(
        self, owner1, owner1_tokens, business1, business2
    ):
        # Owner must be denied (403), NOT given an empty platform scope.
        resp = client_for(owner1_tokens["access"]).get(ADMIN_BUSINESSES)
        assert resp.status_code == 403


class TestPart25IDOR:
    def test_d_idor_valid_uuid_200_arbitrary_404(
        self, superuser, super_tokens, business1
    ):
        valid = client_for(super_tokens["access"]).get(
            f"{ADMIN_BUSINESSES}{business1.id}/"
        )
        assert valid.status_code == 200

        arbitrary = client_for(super_tokens["access"]).get(
            f"{ADMIN_BUSINESSES}{uuid.uuid4()}/"
        )
        assert arbitrary.status_code == 404
        assert "Traceback" not in arbitrary.content.decode()


class TestPart25DataMinimization:
    def test_e_minimum_fields_only(
        self, superuser, super_tokens, business1, business2
    ):
        resp = client_for(super_tokens["access"]).get(ADMIN_BUSINESSES)
        assert resp.status_code == 200
        payload = resp.json()
        items = payload if isinstance(payload, list) else payload.get("results", payload)
        assert items  # at least the seeded businesses are returned
        for item in items:
            # Approved keys present; forbidden PII/financial keys absent.
            assert "id" in item and "name" in item
            for forbidden in FORBIDDEN_KEYS:
                assert forbidden not in item
            assert set(item.keys()).issubset(ALLOWED_BUSINESS_KEYS | {"results"})


class TestPart25ReadOnly:
    def test_f_zero_mutation(
        self, superuser, super_tokens, business1, business2
    ):
        from apps.authentication.models import User
        from apps.business.models import Business, Location, Subscription
        from apps.finance.models import Journal
        from apps.inventory.models import Stock
        from apps.product.models import Product
        from apps.purchasing.models import PurchaseOrder
        from apps.sales.models import Sale

        before = {
            "business": Business.objects.count(),
            "location": Location.objects.count(),
            "user": User.objects.count(),
            "subscription": Subscription.objects.count(),
            "product": Product.objects.count(),
            "stock": Stock.objects.count(),
            "sale": Sale.objects.count(),
            "po": PurchaseOrder.objects.count(),
            "journal": Journal.objects.count(),
        }
        resp = client_for(super_tokens["access"]).get(ADMIN_BUSINESSES)
        assert resp.status_code == 200
        after = {
            "business": Business.objects.count(),
            "location": Location.objects.count(),
            "user": User.objects.count(),
            "subscription": Subscription.objects.count(),
            "product": Product.objects.count(),
            "stock": Stock.objects.count(),
            "sale": Sale.objects.count(),
            "po": PurchaseOrder.objects.count(),
            "journal": Journal.objects.count(),
        }
        assert before == after


class TestPart25MethodBoundary:
    def test_g_get_allowed_others_controlled(
        self, superuser, super_tokens, business1
    ):
        get = client_for(super_tokens["access"]).get(ADMIN_BUSINESSES)
        assert get.status_code == 200
        for method in ("post", "put", "patch", "delete"):
            fn = getattr(client_for(super_tokens["access"]), method)
            resp = fn(ADMIN_BUSINESSES)
            assert resp.status_code in (403, 405)


class TestPart25ErrorSafety:
    def test_i_no_secret_leak(self, superuser, super_tokens, api_client):
        # When implemented, superuser read succeeds; error paths never leak.
        resp = client_for(super_tokens["access"]).get(ADMIN_BUSINESSES)
        assert resp.status_code == 200

        bad = api_client.get(ADMIN_BUSINESSES)  # unauthenticated
        body = bad.content.decode().lower()
        assert "traceback" not in body
        assert "secret" not in body
        assert "authorization" not in body or "Bearer" not in body


class TestPart25ApiBoundary:
    def test_b_existing_businesses_endpoint_untouched(self):
        # PART 1-24 owner-scoped endpoint must still resolve (preservation).
        from django.urls import Resolver404, resolve

        try:
            match = resolve("/api/v1/businesses/")
        except Resolver404:
            pytest.fail("Existing owner-scoped /api/v1/businesses/ route missing.")
        assert match is not None


class TestPart25Persistence:
    def test_h_part25_base_artifacts_preserved(self):
        # PART 25's own required minimal implementation artifacts MUST still
        # exist (contract explicitly lists views.py / urls.py as the expected
        # architecture). Later Domains (e.g. Domain 10) are allowed to add
        # additive models/migrations/services without violating PART 25 intent.
        assert os.path.exists(os.path.join("apps", "admin", "views.py"))
        assert os.path.exists(os.path.join("apps", "admin", "urls.py"))

    def test_h_domain10_additive_models_present(self):
        # Reconciled with Domain 10 Contract Lock: the admin app now legitimately
        # hosts the additive Feature & Module Management models. Verify the
        # expected additive models exist and no destructive schema replacement
        # of existing PART 25/P0 governance occurred.
        from apps.admin import models as admin_models

        expected = {
            "Module",
            "Feature",
            "PlanFeature",
            "BusinessFeatureOverride",
        }
        actual = {m for m in dir(admin_models) if m[0].isupper() and hasattr(getattr(admin_models, m), "_meta")}
        assert expected.issubset(actual), f"Missing Domain 10 models: {expected - actual}"

    def test_h_domain10_additive_migrations_present(self):
        # Domain 10 requires an additive migration; the migrations package must
        # exist and contain at least the Domain 10 initial migration. This is
        # allowed by PART 25 persistence intent (no destructive replacement).
        mig_dir = os.path.join("apps", "admin", "migrations")
        assert os.path.isdir(mig_dir), "Admin migrations package must exist (Domain 10 additive)."
        files = [
            f
            for f in os.listdir(mig_dir)
            if f.endswith(".py") and f != "__init__.py"
        ]
        assert len(files) >= 1, "Expected at least one additive migration file."

    def test_h_domain10_services_serializers_additive(self):
        # Domain 10 Contract Lock requires a centralized entitlement service and
        # explicit serializers. Their presence is expected and additive; they do
        # not replace PART 25's read-only API contract.
        assert os.path.exists(os.path.join("apps", "admin", "services.py"))
        assert os.path.exists(os.path.join("apps", "admin", "serializers.py"))
