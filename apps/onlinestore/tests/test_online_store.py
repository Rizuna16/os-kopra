import pytest

from apps.business.models import Business


try:
    from apps.onlinestore.models import OnlineStore
except Exception:  # RED: module absent until implementation
    OnlineStore = None


pytestmark = pytest.mark.django_db


class TestOnlineStore:
    def test_owner_can_create_online_store_for_own_business(
        self, require_part22, auth_client, business, location
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko Online", "slug": "toko-online", "default_location": str(location.id)},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert OnlineStore.objects.filter(business=business).exists()

    def test_one_online_store_per_business_max(
        self, require_part22, auth_client, business, location
    ):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko Online", "slug": "toko-online", "default_location": str(location.id)},
            content_type="application/json",
        )
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko Online 2", "slug": "toko-online-2", "default_location": str(location.id)},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert OnlineStore.objects.filter(business=business).count() == 1

    def test_slug_globally_unique(self, require_part22, auth_client, other_auth_client, business, other_business, location, other_location):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko A", "slug": "same-slug", "default_location": str(location.id)},
            content_type="application/json",
        )
        response = other_auth_client.post(
            f"/api/v1/businesses/{other_business.id}/online-stores/",
            {"name": "Toko B", "slug": "same-slug", "default_location": str(other_location.id)},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_default_location_must_belong_to_same_business(
        self, require_part22, auth_client, business, other_location
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko", "slug": "toko", "default_location": str(other_location.id)},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert OnlineStore.objects.filter(business=business).count() == 0

    def test_business_not_from_client_input(
        self, require_part22, auth_client, business, other_business, location
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {
                "name": "Toko",
                "slug": "toko",
                "default_location": str(location.id),
                "business": str(other_business.id),
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        store = OnlineStore.objects.get(business=business)
        assert str(store.business_id) == str(business.id)

    def test_owner_only_accesses_own_online_store(
        self, require_part22, auth_client, other_auth_client, business, other_business, location
    ):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko", "slug": "toko", "default_location": str(location.id)},
            content_type="application/json",
        )
        response = other_auth_client.get(
            f"/api/v1/businesses/{other_business.id}/online-stores/"
        )
        assert response.status_code == 200
        assert len(response.data) == 0

    def test_is_active_available(self, require_part22, auth_client, business, location):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko", "slug": "toko", "default_location": str(location.id)},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert "is_active" in response.data
        assert response.data["is_active"] is True


class TestLockedRegressionOnlineStore:
    def test_sale_model_not_modified_by_part22(self, require_part22, business, location):
        from apps.sales.models import Sale

        assert not hasattr(Sale, "channel")
        assert not hasattr(Sale, "source")
        assert not hasattr(Sale, "order_type")

    def test_sale_status_semantics_unchanged(self, require_part22, business, location):
        from apps.sales.models import Sale

        assert set(Sale.Status.values) == {"DRAFT", "COMPLETED", "VOIDED"}
