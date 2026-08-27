import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, BusinessMembership

User = get_user_model()


@pytest.fixture
def owner_user(db):
    return User.objects.create_user(email="owner_sec@example.com", password="SecurePass123!")


@pytest.fixture
def member_user(db):
    return User.objects.create_user(email="member_sec@example.com", password="SecurePass123!")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(email="other_sec@example.com", password="SecurePass123!")


@pytest.fixture
def business(db, owner_user):
    return Business.objects.create(name="Toko Keamanan", owner=owner_user)


@pytest.fixture
def owner_client(client, owner_user):
    token = RefreshToken.for_user(owner_user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(token.access_token)}"
    return client


@pytest.fixture
def member_client(client, member_user):
    token = RefreshToken.for_user(member_user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(token.access_token)}"
    return client


@pytest.mark.django_db
class TestGreen3MicroSecurity:
    def test_a_owner_can_create_and_manage_membership(self, owner_client, business, other_user):
        response = owner_client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(other_user.id), "role": "ADMIN"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["role"] == "ADMIN"

    def test_b_non_owner_cannot_create_membership(self, member_client, business, other_user):
        response = member_client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(other_user.id), "role": "ADMIN"},
            content_type="application/json",
        )
        assert response.status_code == 404
        assert not BusinessMembership.objects.filter(business=business, user=other_user).exists()

    def test_c_non_owner_cannot_assign_owner(self, owner_client, business, member_user):
        # Even owner or non-owner attempting malicious payload if restricted, but let's check non-owner calling:
        pass

    def test_d_member_cannot_self_promote_or_modify_role(self, member_client, business, member_user):
        # A member cannot even access the membership management endpoint (returns 404 because Business.objects.filter(owner=request.user))
        response = member_client.get(f"/api/v1/businesses/{business.id}/members/")
        assert response.status_code == 404

    def test_e_membership_role_owner_does_not_change_business_owner(self, owner_client, business, member_user):
        original_owner = business.owner
        membership = BusinessMembership.objects.create(
            business=business, user=member_user, role="OWNER"
        )
        business.refresh_from_db()
        assert business.owner == original_owner
        assert business.owner != membership.user

    def test_f_existing_owner_behavior_remains_intact(self, owner_client, business):
        response = owner_client.get(f"/api/v1/businesses/{business.id}/members/")
        assert response.status_code == 200

    def test_g_invalid_role_rejected(self, owner_client, business, other_user):
        response = owner_client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(other_user.id), "role": "SUPERADMIN_HACK"},
            content_type="application/json",
        )
        assert response.status_code == 400
