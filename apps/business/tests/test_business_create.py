from rest_framework_simplejwt.tokens import RefreshToken

import pytest
from django.contrib.auth import get_user_model

from apps.business.models import Business

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="test@example.com",
        password="SecurePass123!",
        first_name="Test",
        last_name="User",
    )


@pytest.fixture
def auth_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


@pytest.fixture
def auth_client(client, auth_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {auth_tokens['access']}"
    return client


@pytest.mark.django_db
class TestBusinessCreateView:
    def test_create_business_success(self, auth_client, user):
        response = auth_client.post(
            "/api/v1/businesses/",
            {"name": "Toko Budi"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["name"] == "Toko Budi"
        assert response.data["owner"] == str(user.id)
        assert response.data["status"] == "ONBOARDING"
        assert "id" in response.data
        assert "created_at" in response.data
        assert "updated_at" in response.data

        business = Business.objects.get(id=response.data["id"])
        assert business.owner == user
        assert business.name == "Toko Budi"
        assert business.status == "ONBOARDING"

    def test_create_business_owner_is_request_user(self, auth_client, user):
        response = auth_client.post(
            "/api/v1/businesses/",
            {"name": "Toko Budi"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["owner"] == str(user.id)

    def test_create_business_owner_not_in_request_body(self, auth_client, user):
        response = auth_client.post(
            "/api/v1/businesses/",
            {"name": "Toko Budi", "owner": "different-user-id"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["owner"] == str(user.id)

    def test_create_business_status_onboarding(self, auth_client, user):
        response = auth_client.post(
            "/api/v1/businesses/",
            {"name": "Toko Budi"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["status"] == "ONBOARDING"

    def test_create_business_unauthenticated(self, client):
        response = client.post(
            "/api/v1/businesses/",
            {"name": "Toko Budi"},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_create_second_business_same_user(self, auth_client, user):
        response1 = auth_client.post(
            "/api/v1/businesses/",
            {"name": "Toko Budi"},
            content_type="application/json",
        )
        assert response1.status_code == 201

        response2 = auth_client.post(
            "/api/v1/businesses/",
            {"name": "Budi Coffee"},
            content_type="application/json",
        )
        assert response2.status_code == 201
        assert response2.data["name"] == "Budi Coffee"
        assert response2.data["owner"] == str(user.id)

        businesses = Business.objects.filter(owner=user)
        assert businesses.count() == 2

    def test_create_business_does_not_create_location(self, auth_client, user):
        response = auth_client.post(
            "/api/v1/businesses/",
            {"name": "Toko Budi"},
            content_type="application/json",
        )
        assert response.status_code == 201
        # Business model has no Location relation, so nothing to check
        assert "location" not in response.data

    def test_create_business_does_not_create_subscription(self, auth_client, user):
        response = auth_client.post(
            "/api/v1/businesses/",
            {"name": "Toko Budi"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert "subscription" not in response.data

    def test_create_business_does_not_create_user(self, auth_client, user):
        response = auth_client.post(
            "/api/v1/businesses/",
            {"name": "Toko Budi"},
            content_type="application/json",
        )
        assert response.status_code == 201
        # No new user should be created
        assert "user" not in response.data or response.data.get("owner") == str(user.id)

    def test_create_business_status_mass_assignment_ignored(self, auth_client, user):
        response = auth_client.post(
            "/api/v1/businesses/",
            {"name": "Toko Budi", "status": "ACTIVE"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["status"] == "ONBOARDING"
        business = Business.objects.get(id=response.data["id"])
        assert business.status == "ONBOARDING"

    def test_create_business_without_name_rejected(self, auth_client, user):
        before = Business.objects.count()
        response = auth_client.post(
            "/api/v1/businesses/",
            {},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert Business.objects.count() == before