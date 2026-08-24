import pytest
from django.urls import Resolver404, resolve

from apps.security.tests.conftest import client_for

pytestmark = pytest.mark.django_db


class TestPart26RegressionTenantIsolation:
    def test_r1_existing_auth_required(self, api_client):
        resp = api_client.get("/api/v1/businesses/")
        assert resp.status_code == 401

    def test_r1_part25_superadmin_boundary_intact(
        self, superuser, super_tokens, owner1, owner1_tokens
    ):
        sup = client_for(super_tokens["access"]).get("/api/v1/admin/businesses/")
        assert sup.status_code == 200
        own = client_for(owner1_tokens["access"]).get("/api/v1/admin/businesses/")
        assert own.status_code == 403


class TestPart26RegressionApiBoundary:
    def test_r2_owner_business_endpoint_resolves(self):
        try:
            match = resolve("/api/v1/businesses/")
        except Resolver404:
            pytest.fail("Existing owner-scoped /api/v1/businesses/ route missing.")
        assert match is not None

    def test_r2_part25_admin_endpoint_resolves(self):
        try:
            match = resolve("/api/v1/admin/businesses/")
        except Resolver404:
            pytest.fail("Existing PART 25 admin route missing.")
        assert match is not None


class TestPart26RegressionPublicStorefront:
    def test_r3_part22_public_storefront_allowany_preserved(self):
        # PART 22 public storefront routes must still resolve (AllowAny intact).
        for route in (
            "/api/v1/stores/budi-fashion/",
            "/api/v1/stores/budi-fashion/products/",
            "/api/v1/stores/budi-fashion/cart/",
            "/api/v1/stores/budi-fashion/checkout/",
        ):
            try:
                resolve(route)
            except Resolver404:
                pytest.fail(f"PART 22 public route missing: {route}")


class TestPart26RegressionNoNewModels:
    def test_r4_no_part26_production_app_introduced(self):
        # PART 26 RED must not create production apps/models/migrations.
        import os

        assert not os.path.exists(os.path.join("apps", "security", "models.py"))
        assert not os.path.exists(os.path.join("apps", "security", "migrations"))
        assert not os.path.exists(os.path.join("apps", "security", "views.py"))
        assert not os.path.exists(os.path.join("apps", "security", "urls.py"))
