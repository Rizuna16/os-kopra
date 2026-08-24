from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, BusinessMembership, Location

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="owner@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="other@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def auth_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token)}


@pytest.fixture
def other_tokens(other_user):
    refresh = RefreshToken.for_user(other_user)
    return {"access": str(refresh.access_token)}


@pytest.fixture
def auth_client(client, auth_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {auth_tokens['access']}"
    return client


@pytest.fixture
def other_auth_client(client, other_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {other_tokens['access']}"
    return client


@pytest.fixture
def business(db, user):
    return Business.objects.create(name="Toko Budi", owner=user)


@pytest.fixture
def other_business(db, other_user):
    return Business.objects.create(name="Toko Lain", owner=other_user)


@pytest.fixture
def location(db, business):
    return Location.objects.create(business=business, name="Gudang Utama")


@pytest.fixture
def other_location(db, other_business):
    return Location.objects.create(business=other_business, name="Gudang Lain")


@pytest.mark.django_db
class TestLocationListView:
    def test_owner_can_list_locations(self, auth_client, business, location):
        response = auth_client.get(
            f"/api/v1/businesses/{business.id}/locations/"
        )
        assert response.status_code == 200
        assert isinstance(response.data, list)
        assert len(response.data) >= 1
        ids = [item["id"] for item in response.data]
        assert str(location.id) in ids

    def test_cross_business_cannot_list_locations_404(
        self, other_auth_client, business, location
    ):
        response = other_auth_client.get(
            f"/api/v1/businesses/{business.id}/locations/"
        )
        assert response.status_code == 404

    def test_unauthenticated_list_returns_401(self, client, business):
        response = client.get(
            f"/api/v1/businesses/{business.id}/locations/"
        )
        assert response.status_code == 401


@pytest.mark.django_db
class TestLocationDetailView:
    def test_owner_can_retrieve_location(self, auth_client, business, location):
        response = auth_client.get(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/"
        )
        assert response.status_code == 200
        assert response.data["id"] == str(location.id)
        assert response.data["name"] == location.name
        assert response.data["business"] == str(business.id)

    def test_nonexistent_location_returns_404(self, auth_client, business):
        response = auth_client.get(
            f"/api/v1/businesses/{business.id}/locations/{uuid4()}/"
        )
        assert response.status_code == 404

    def test_cross_business_location_returns_404(
        self, auth_client, business, other_location
    ):
        response = auth_client.get(
            f"/api/v1/businesses/{business.id}/locations/{other_location.id}/"
        )
        assert response.status_code == 404

    def test_unauthenticated_detail_returns_401(self, client, business, location):
        response = client.get(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/"
        )
        assert response.status_code == 401


@pytest.mark.django_db
class TestLocationUpdateView:
    def test_owner_can_update_location(self, auth_client, business, location):
        response = auth_client.patch(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/",
            {"name": "Gudang Baru"},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.data["name"] == "Gudang Baru"
        location.refresh_from_db()
        assert location.name == "Gudang Baru"

    def test_business_ownership_cannot_be_changed(
        self, auth_client, business, location, other_business
    ):
        original_business = str(business.id)
        response = auth_client.patch(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/",
            {"business": str(other_business.id), "name": "Gudang Edit"},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.data["business"] == original_business
        location.refresh_from_db()
        assert str(location.business_id) == original_business

    def test_nonexistent_location_update_returns_404(self, auth_client, business):
        response = auth_client.patch(
            f"/api/v1/businesses/{business.id}/locations/{uuid4()}/",
            {"name": "Gudang Baru"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_cross_business_update_returns_404(
        self, auth_client, business, other_location
    ):
        response = auth_client.patch(
            f"/api/v1/businesses/{business.id}/locations/{other_location.id}/",
            {"name": "Gudang Baru"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_unauthenticated_update_returns_401(self, client, business, location):
        response = client.patch(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/",
            {"name": "Gudang Baru"},
            content_type="application/json",
        )
        assert response.status_code == 401


@pytest.mark.django_db
class TestLocationDeleteView:
    def test_owner_can_delete_location(self, auth_client, business, location):
        response = auth_client.delete(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/"
        )
        assert response.status_code == 204

    def test_deleted_location_no_longer_exists(
        self, auth_client, business, location
    ):
        auth_client.delete(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/"
        )
        assert not Location.objects.filter(pk=location.id).exists()

    def test_nonexistent_location_delete_returns_404(
        self, auth_client, business
    ):
        response = auth_client.delete(
            f"/api/v1/businesses/{business.id}/locations/{uuid4()}/"
        )
        assert response.status_code == 404

    def test_cross_business_delete_returns_404(
        self, auth_client, business, other_location
    ):
        response = auth_client.delete(
            f"/api/v1/businesses/{business.id}/locations/{other_location.id}/"
        )
        assert response.status_code == 404

    def test_unauthenticated_delete_returns_401(self, client, user):
        business = Business.objects.create(name="Toko Budi", owner=user)
        location = Location.objects.create(business=business, name="Gudang")
        response = client.delete(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/"
        )
        assert response.status_code == 401

    def test_delete_does_not_affect_other_location(
        self, auth_client, business, location, other_business
    ):
        other_loc = Location.objects.create(
            business=other_business, name="Lain"
        )
        auth_client.delete(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/"
        )
        assert Location.objects.filter(pk=other_loc.id).exists()

    def test_delete_does_not_delete_business(
        self, auth_client, business, location
    ):
        before = Business.objects.count()
        auth_client.delete(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/"
        )
        assert Business.objects.count() == before

    def test_member_cannot_delete_location_404(
        self, other_auth_client, business, other_user, location
    ):
        BusinessMembership.objects.create(business=business, user=other_user)
        before = Location.objects.count()
        response = other_auth_client.delete(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/"
        )
        assert response.status_code == 404
        assert Location.objects.count() == before
