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


@pytest.mark.django_db
class TestMemberCreateView:
    def test_owner_can_add_member(self, auth_client, business, other_user):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(other_user.id)},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert "id" in response.data
        assert response.data["business"] == str(business.id)
        assert response.data["user"]["id"] == str(other_user.id)

    def test_added_member_connected_to_business(self, auth_client, business, other_user):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(other_user.id)},
            content_type="application/json",
        )
        membership = BusinessMembership.objects.get(user=other_user)
        assert membership.business == business

    def test_member_is_correct_user(self, auth_client, business, other_user):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(other_user.id)},
            content_type="application/json",
        )
        membership = BusinessMembership.objects.get(user=other_user)
        assert membership.user == other_user

    def test_non_owner_cannot_add_member(self, client, business, other_user):
        user_token = RefreshToken.for_user(other_user)
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(user_token.access_token)}"
        response = client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(other_user.id)},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, business, other_user):
        response = client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(other_user.id)},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_invalid_business_returns_404(self, auth_client, other_user):
        response = auth_client.post(
            f"/api/v1/businesses/{uuid.uuid4()}/members/",
            {"user_id": str(other_user.id)},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_invalid_user_returns_400(self, auth_client, business):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(uuid.uuid4())},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_duplicate_membership_rejected(self, auth_client, business, other_user):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(other_user.id)},
            content_type="application/json",
        )
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(other_user.id)},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_owner_cannot_add_self(self, auth_client, business, user):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(user.id)},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "owner" in response.data["errors"]["user_id"][0].lower()


@pytest.mark.django_db
class TestMemberListView:
    def test_owner_can_list_members(self, auth_client, business, other_user):
        BusinessMembership.objects.create(business=business, user=other_user)
        response = auth_client.get(
            f"/api/v1/businesses/{business.id}/members/",
        )
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]["user"]["id"] == str(other_user.id)

    def test_non_owner_cannot_list_members(self, client, business, other_user):
        user_token = RefreshToken.for_user(other_user)
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(user_token.access_token)}"
        response = client.get(
            f"/api/v1/businesses/{business.id}/members/",
        )
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, business):
        response = client.get(
            f"/api/v1/businesses/{business.id}/members/",
        )
        assert response.status_code == 401


@pytest.mark.django_db
class TestMemberDeleteView:
    def test_owner_can_remove_member(self, auth_client, business, other_user):
        BusinessMembership.objects.create(business=business, user=other_user)
        response = auth_client.delete(
            f"/api/v1/businesses/{business.id}/members/{other_user.id}/",
        )
        assert response.status_code == 204
        assert not BusinessMembership.objects.filter(
            business=business, user=other_user
        ).exists()

    def test_non_owner_cannot_remove_member(self, client, business, other_user):
        BusinessMembership.objects.create(business=business, user=other_user)
        user_token = RefreshToken.for_user(other_user)
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(user_token.access_token)}"
        response = client.delete(
            f"/api/v1/businesses/{business.id}/members/{other_user.id}/",
        )
        assert response.status_code == 404
        assert BusinessMembership.objects.filter(
            business=business, user=other_user
        ).exists()

    def test_remove_nonexistent_member_returns_404(self, auth_client, business, other_user):
        response = auth_client.delete(
            f"/api/v1/businesses/{business.id}/members/{other_user.id}/",
        )
        assert response.status_code == 404

    def test_owner_cannot_delete_membership_of_other_business(
        self, auth_client, business, user
    ):
        other_owner = User.objects.create_user(
            email="other-owner@example.com", password="SecurePass123!"
        )
        biz_b = Business.objects.create(name="Toko Lain", owner=other_owner)
        member_c = User.objects.create_user(
            email="member-c@example.com", password="SecurePass123!"
        )
        membership = BusinessMembership.objects.create(business=biz_b, user=member_c)

        response = auth_client.delete(
            f"/api/v1/businesses/{biz_b.id}/members/{member_c.id}/",
        )
        assert response.status_code == 404
        assert BusinessMembership.objects.filter(id=membership.id).exists()


@pytest.mark.django_db
class TestMembershipSideEffects:
    def test_adding_member_does_not_create_user(self, auth_client, business, other_user):
        before = User.objects.count()
        auth_client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(other_user.id)},
            content_type="application/json",
        )
        assert User.objects.count() == before

    def test_adding_member_does_not_create_location(self, auth_client, business, other_user):
        from apps.business.models import Location
        before = Location.objects.count()
        auth_client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(other_user.id)},
            content_type="application/json",
        )
        assert Location.objects.count() == before

    def test_adding_member_does_not_create_subscription(self, auth_client, business, other_user):
        from apps.business.models import Subscription
        before = Subscription.objects.count()
        auth_client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(other_user.id)},
            content_type="application/json",
        )
        assert Subscription.objects.count() == before

    def test_adding_member_does_not_change_owner(self, auth_client, business, other_user):
        original_owner_id = business.owner_id
        auth_client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(other_user.id)},
            content_type="application/json",
        )
        business.refresh_from_db()
        assert business.owner_id == original_owner_id

    def test_removing_member_does_not_delete_user(self, auth_client, business, other_user):
        BusinessMembership.objects.create(business=business, user=other_user)
        before = User.objects.count()
        auth_client.delete(
            f"/api/v1/businesses/{business.id}/members/{other_user.id}/",
        )
        assert User.objects.count() == before


@pytest.mark.django_db
class TestCrossBusinessIsolation:
    def test_non_owner_cannot_access_other_business(self, client, business, other_user):
        BusinessMembership.objects.create(business=business, user=other_user)
        user_token = RefreshToken.for_user(other_user)
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(user_token.access_token)}"

        response_get = client.get(
            f"/api/v1/businesses/{business.id}/members/",
        )
        assert response_get.status_code == 404

        response_create = client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(other_user.id)},
            content_type="application/json",
        )
        assert response_create.status_code == 404

        response_delete = client.delete(
            f"/api/v1/businesses/{business.id}/members/{other_user.id}/",
        )
        assert response_delete.status_code == 404

    def test_owner_cannot_add_member_to_nonexistent_business(self, auth_client, other_user):
        response = auth_client.post(
            f"/api/v1/businesses/{uuid.uuid4()}/members/",
            {"user_id": str(other_user.id)},
            content_type="application/json",
        )
        assert response.status_code == 404
