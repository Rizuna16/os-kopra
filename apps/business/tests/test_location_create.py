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


@pytest.mark.django_db
class TestLocationCreateView:
    def test_owner_can_create_location(self, auth_client, business, user):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/",
            {"name": "Cabang Jakarta"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["name"] == "Cabang Jakarta"
        assert response.data["business"] == str(business.id)
        assert "id" in response.data
        assert "created_at" in response.data

        location = Location.objects.get(id=response.data["id"])
        assert location.business == business
        assert location.name == "Cabang Jakarta"

    def test_location_connected_to_correct_business(self, auth_client, business):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/",
            {"name": "Cabang Jakarta"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["business"] == str(business.id)

        location = Location.objects.get(id=response.data["id"])
        assert location.business_id == business.id

    def test_owner_of_location_is_business_owner(self, auth_client, business, user):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/",
            {"name": "Cabang Jakarta"},
            content_type="application/json",
        )
        assert response.status_code == 201
        location = Location.objects.get(id=response.data["id"])
        assert location.business.owner == user

    def test_other_user_cannot_create_location_404(self, other_auth_client, business):
        response = other_auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/",
            {"name": "Cabang Jakarta"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, business):
        response = client.post(
            f"/api/v1/businesses/{business.id}/locations/",
            {"name": "Cabang Jakarta"},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_second_location_created(self, auth_client, business):
        for name in ["Cabang Jakarta", "Cabang Bandung"]:
            response = auth_client.post(
                f"/api/v1/businesses/{business.id}/locations/",
                {"name": name},
                content_type="application/json",
            )
            assert response.status_code == 201
        assert Location.objects.filter(business=business).count() == 2

    def test_multiple_locations_allowed(self, auth_client, business):
        names = ["Jkt", "Bdg", "Sby", "Bali"]
        for name in names:
            response = auth_client.post(
                f"/api/v1/businesses/{business.id}/locations/",
                {"name": name},
                content_type="application/json",
            )
            assert response.status_code == 201
        assert Location.objects.filter(business=business).count() == len(names)

    def test_does_not_create_new_business(self, auth_client, business):
        before = Business.objects.count()
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/",
            {"name": "Cabang Jakarta"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert Business.objects.count() == before

    def test_does_not_create_subscription(self, auth_client, business):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/",
            {"name": "Cabang Jakarta"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert "subscription" not in response.data

    def test_does_not_create_user(self, auth_client, business):
        before = User.objects.count()
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/",
            {"name": "Cabang Jakarta"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert User.objects.count() == before

    def test_invalid_business_id_returns_404(self, auth_client):
        response = auth_client.post(
            f"/api/v1/businesses/{uuid4()}/locations/",
            {"name": "Cabang Jakarta"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_member_cannot_create_location_404(self, other_auth_client, business, other_user):
        BusinessMembership.objects.create(business=business, user=other_user)
        before = Location.objects.count()
        response = other_auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/",
            {"name": "Cabang Jakarta"},
            content_type="application/json",
        )
        assert response.status_code == 404
        assert Location.objects.count() == before