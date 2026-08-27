import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, BusinessMembership

User = get_user_model()


@pytest.fixture
def owner_a(db):
    return User.objects.create_user(email="owner_a_4a@example.com", password="SecurePass123!")


@pytest.fixture
def owner_c(db):
    return User.objects.create_user(email="owner_c_4a@example.com", password="SecurePass123!")


@pytest.fixture
def account_b(db):
    return User.objects.create_user(email="account_b_4a@example.com", password="SecurePass123!")


@pytest.fixture
def business_a(db, owner_a):
    return Business.objects.create(name="Business A", owner=owner_a)


@pytest.fixture
def business_b(db, owner_c):
    return Business.objects.create(name="Business B", owner=owner_c)


def auth_client_for(user):
    from rest_framework.test import APIClient
    client = APIClient()
    token = RefreshToken.for_user(user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(token.access_token)}"
    return client


@pytest.mark.django_db
class TestAuthorizationFoundationRed:
    def test_red_4a_admin_membership_authorized(self, account_b, business_a):
        # Setup: Account B is ADMIN member of Business A (owned by Owner A)
        BusinessMembership.objects.create(business=business_a, user=account_b, role="ADMIN")

        # TARGET contract: a valid Admin membership is recognized at the
        # business authorization boundary and the request is authorized.
        client = auth_client_for(account_b)
        response = client.get(f"/api/v1/businesses/{business_a.id}/employees/")
        assert response.status_code == 200

    def test_red_4a_kasir_membership_authorized(self, account_b, business_a):
        # Setup: Account B is KASIR member of Business A
        BusinessMembership.objects.create(business=business_a, user=account_b, role="KASIR")

        # TARGET contract: a valid Kasir membership is recognized at the
        # business authorization boundary. Using sales endpoint which Kasir is allowed.
        client = auth_client_for(account_b)
        response = client.get(f"/api/v1/businesses/{business_a.id}/sales/")
        assert response.status_code == 200

    def test_red_4a_cross_business_membership_roles(self, account_b, business_a, business_b):
        # Setup: Account B is ADMIN in Business A, KASIR in Business B
        BusinessMembership.objects.create(business=business_a, user=account_b, role="ADMIN")
        BusinessMembership.objects.create(business=business_b, user=account_b, role="KASIR")

        # TARGET contract: each business context resolves its own membership role.
        client_a = auth_client_for(account_b)
        resp_a = client_a.get(f"/api/v1/businesses/{business_a.id}/employees/")
        assert resp_a.status_code == 200  # ADMIN context in Business A

        client_b = auth_client_for(account_b)
        resp_b = client_b.get(f"/api/v1/businesses/{business_b.id}/sales/")
        assert resp_b.status_code == 200  # KASIR context in Business B

    def test_red_4a_no_membership_denied(self, account_b, business_a):
        # Baseline security: Account with no membership and not owner is denied.
        client = auth_client_for(account_b)
        response = client.get(f"/api/v1/businesses/{business_a.id}/employees/")
        assert response.status_code == 404

    def test_red_4a_owner_authorized(self, owner_a, business_a):
        # Baseline: Owner remains authorized.
        client = auth_client_for(owner_a)
        response = client.get(f"/api/v1/businesses/{business_a.id}/employees/")
        assert response.status_code == 200

    def test_red_4a_superadmin_independent(self, db):
        # Baseline: Super Admin independent of BusinessMembership.
        super_user = User.objects.create_superuser(email="super4a@example.com", password="SecurePass123!")
        assert super_user.is_superuser
        assert not BusinessMembership.objects.filter(user=super_user).exists()
