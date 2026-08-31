from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, BusinessMembership, Location, Subscription

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
class TestSubscriptionCreateView:
    def test_owner_can_create_subscription(self, auth_client, business, user):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/subscription/",
            {},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["business"] == str(business.id)
        assert response.data["status"] == "TRIAL"
        assert "id" in response.data
        assert "created_at" in response.data

        subscription = Subscription.objects.get(id=response.data["id"])
        assert subscription.business == business
        assert subscription.status == Subscription.Status.TRIAL

    def test_subscription_belongs_to_correct_business(self, auth_client, business):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/subscription/",
            {},
            content_type="application/json",
        )
        assert response.status_code == 201
        subscription = Subscription.objects.get(id=response.data["id"])
        assert subscription.business_id == business.id

    def test_second_business_gets_independent_subscription(self, auth_client, user):
        biz1 = Business.objects.create(name="Toko Budi", owner=user)
        biz2 = Business.objects.create(name="Budi Coffee", owner=user)

        r1 = auth_client.post(
            f"/api/v1/businesses/{biz1.id}/subscription/",
            {},
            content_type="application/json",
        )
        r2 = auth_client.post(
            f"/api/v1/businesses/{biz2.id}/subscription/",
            {},
            content_type="application/json",
        )
        assert r1.status_code == 201
        assert r2.status_code == 201

        s1 = Subscription.objects.get(id=r1.data["id"])
        s2 = Subscription.objects.get(id=r2.data["id"])
        assert s1.business_id == biz1.id
        assert s2.business_id == biz2.id
        assert s1 != s2

    def test_other_user_cannot_create_subscription_404(self, other_auth_client, business):
        response = other_auth_client.post(
            f"/api/v1/businesses/{business.id}/subscription/",
            {},
            content_type="application/json",
        )
        assert response.status_code == 404
        assert Subscription.objects.filter(business=business).count() == 0

    def test_unauthenticated_returns_401(self, client, business):
        response = client.post(
            f"/api/v1/businesses/{business.id}/subscription/",
            {},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_invalid_business_returns_404(self, auth_client):
        response = auth_client.post(
            f"/api/v1/businesses/{uuid4()}/subscription/",
            {},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_member_cannot_create_subscription_404(self, other_auth_client, business, other_user):
        BusinessMembership.objects.create(business=business, user=other_user)
        before = Subscription.objects.count()
        response = other_auth_client.post(
            f"/api/v1/businesses/{business.id}/subscription/",
            {},
            content_type="application/json",
        )
        assert response.status_code == 404
        assert Subscription.objects.count() == before

    def test_subscription_does_not_create_another_business(self, auth_client, business):
        before = Business.objects.count()
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/subscription/",
            {},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert Business.objects.count() == before

    def test_subscription_does_not_create_location(self, auth_client, business):
        before = Location.objects.count()
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/subscription/",
            {},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert Location.objects.count() == before

    def test_subscription_does_not_create_user(self, auth_client, business):
        before = User.objects.count()
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/subscription/",
            {},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert User.objects.count() == before

    def test_duplicate_active_subscription_rejected(self, auth_client, business):
        r1 = auth_client.post(
            f"/api/v1/businesses/{business.id}/subscription/",
            {},
            content_type="application/json",
        )
        assert r1.status_code == 201

        r2 = auth_client.post(
            f"/api/v1/businesses/{business.id}/subscription/",
            {},
            content_type="application/json",
        )
        assert r2.status_code == 400
        assert Subscription.objects.filter(business=business).count() == 1