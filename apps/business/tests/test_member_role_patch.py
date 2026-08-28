import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, BusinessMembership

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
def member_user(db):
    return User.objects.create_user(
        email="member@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def auth_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token)}


@pytest.fixture
def auth_client(client, auth_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {auth_tokens['access']}"
    return client


@pytest.fixture
def business(db, user):
    return Business.objects.create(name="Toko Budi", owner=user)


@pytest.fixture
def other_business(db, other_user):
    return Business.objects.create(name="Toko Lain", owner=other_user)


@pytest.mark.django_db
class TestMemberRolePatch:
    def test_owner_can_update_member_role(self, auth_client, business, member_user):
        BusinessMembership.objects.create(
            business=business, user=member_user, role="KASIR"
        )
        response = auth_client.patch(
            f"/api/v1/businesses/{business.id}/members/{member_user.id}/",
            {"role": "ADMIN"},
            content_type="application/json",
        )
        assert response.status_code == 200
        membership = BusinessMembership.objects.get(
            business=business, user=member_user
        )
        assert membership.role == "ADMIN"

    def test_non_owner_cannot_update_member_role(
        self, client, business, other_user, member_user
    ):
        BusinessMembership.objects.create(
            business=business, user=member_user, role="KASIR"
        )
        token = RefreshToken.for_user(other_user)
        client.defaults["HTTP_AUTHORIZATION"] = (
            f"Bearer {str(token.access_token)}"
        )
        response = client.patch(
            f"/api/v1/businesses/{business.id}/members/{member_user.id}/",
            {"role": "ADMIN"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_invalid_role_rejected(self, auth_client, business, member_user):
        BusinessMembership.objects.create(
            business=business, user=member_user, role="KASIR"
        )
        response = auth_client.patch(
            f"/api/v1/businesses/{business.id}/members/{member_user.id}/",
            {"role": "OWNER"},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_unauthenticated_patch_returns_401(self, client, business, member_user):
        BusinessMembership.objects.create(
            business=business, user=member_user, role="KASIR"
        )
        response = client.patch(
            f"/api/v1/businesses/{business.id}/members/{member_user.id}/",
            {"role": "ADMIN"},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_cross_business_patch_blocked(
        self, auth_client, other_business, member_user
    ):
        BusinessMembership.objects.create(
            business=other_business, user=member_user, role="KASIR"
        )
        response = auth_client.patch(
            f"/api/v1/businesses/{other_business.id}/members/{member_user.id}/",
            {"role": "ADMIN"},
            content_type="application/json",
        )
        assert response.status_code == 404
        membership = BusinessMembership.objects.get(
            business=other_business, user=member_user
        )
        assert membership.role == "KASIR"
