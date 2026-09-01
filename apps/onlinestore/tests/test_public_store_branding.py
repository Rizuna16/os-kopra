import pytest
from rest_framework.test import APIClient
from apps.onlinestore.models import OnlineStore

pytestmark = pytest.mark.django_db


class TestPublicStoreBranding:
    def test_public_store_exposes_branding_fields_from_parent_business(
        self, require_part22, business, location
    ):
        business.logo_url = "https://example.com/logo.png"
        business.brand_color = "#FF5733"
        business.tagline = "Best Store Ever"
        business.save()

        store = OnlineStore.objects.create(
            business=business,
            name="Branded Store",
            slug="branded-store",
            default_location=location,
            is_active=True,
        )

        client = APIClient()
        response = client.get(f"/api/v1/stores/{store.slug}/")

        assert response.status_code == 200
        data = response.data
        assert data["logo_url"] == "https://example.com/logo.png"
        assert data["brand_color"] == "#FF5733"
        assert data["tagline"] == "Best Store Ever"

    def test_public_store_handles_null_branding_values(
        self, require_part22, business, location
    ):
        business.logo_url = None
        business.brand_color = None
        business.tagline = None
        business.save()

        store = OnlineStore.objects.create(
            business=business,
            name="Unbranded Store",
            slug="unbranded-store",
            default_location=location,
            is_active=True,
        )

        client = APIClient()
        response = client.get(f"/api/v1/stores/{store.slug}/")

        assert response.status_code == 200
        data = response.data
        assert data["logo_url"] is None
        assert data["brand_color"] is None
        assert data["tagline"] is None

    def test_public_store_preserves_existing_fields(
        self, require_part22, business, location
    ):
        store = OnlineStore.objects.create(
            business=business,
            name="Existing Fields Store",
            slug="existing-store",
            default_location=location,
            is_active=True,
        )

        client = APIClient()
        response = client.get(f"/api/v1/stores/{store.slug}/")

        assert response.status_code == 200
        data = response.data
        assert data["id"] == str(store.id)
        assert data["name"] == "Existing Fields Store"
        assert data["slug"] == "existing-store"
        assert data["is_active"] is True

    def test_public_store_accessible_without_authentication(
        self, require_part22, business, location
    ):
        store = OnlineStore.objects.create(
            business=business,
            name="Public Store",
            slug="public-store-no-auth",
            default_location=location,
            is_active=True,
        )

        client = APIClient()
        response = client.get(f"/api/v1/stores/{store.slug}/")
        assert response.status_code == 200

    def test_unrelated_business_private_fields_not_exposed(
        self, require_part22, business, location
    ):
        store = OnlineStore.objects.create(
            business=business,
            name="Private Fields Check",
            slug="private-check-store",
            default_location=location,
            is_active=True,
        )

        client = APIClient()
        response = client.get(f"/api/v1/stores/{store.slug}/")

        assert response.status_code == 200
        data = response.data
        assert set(data.keys()) == {
            "id",
            "name",
            "slug",
            "is_active",
            "logo_url",
            "brand_color",
            "tagline",
        }
        assert "owner" not in data
        assert "created_at" not in data
        assert "updated_at" not in data
        assert "default_location" not in data
        assert "business" not in data
