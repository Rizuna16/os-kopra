import pytest

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, BusinessMembership

User = get_user_model()


@pytest.fixture
def employee_account(db):
    return User.objects.create_user(
        email="employee-account@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def admin_account(db):
    return User.objects.create_user(
        email="admin-account@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def business(db, admin_account):
    return Business.objects.create(name="Toko Anggota", owner=admin_account)


class TestMembershipFoundation:
    def test_1_account_can_belong_to_business_through_membership(self, employee_account, business):
        Membership = BusinessMembership.objects.create(
            business=business, user=employee_account
        )
        assert Membership.user == employee_account
        assert Membership.business == business

    def test_2_multiple_businesses_can_be_associated_with_one_account(self, employee_account, admin_account, db):
        biz1 = Business.objects.create(name="Bisnis A", owner=admin_account)
        biz2 = Business.objects.create(name="Bisnis B", owner=admin_account)
        m1 = BusinessMembership.objects.create(business=biz1, user=employee_account)
        m2 = BusinessMembership.objects.create(business=biz2, user=employee_account)
        assert m1.pk is not None
        assert m2.pk is not None
        assert biz1 in [m.business for m in employee_account.business_memberships.all()]
        assert biz2 in [m.business for m in employee_account.business_memberships.all()]

    def test_3_multiple_accounts_can_belong_to_one_business(self, employee_account, admin_account, business):
        employee2 = User.objects.create_user(
            email="employee2@example.com", password="SecurePass123!"
        )
        m1 = BusinessMembership.objects.create(business=business, user=employee_account)
        m2 = BusinessMembership.objects.create(business=business, user=employee2)
        assert BusinessMembership.objects.filter(business=business).count() == 2

    def test_4_duplicate_account_business_membership_is_rejected(self, employee_account, business, admin_account):
        BusinessMembership.objects.create(business=business, user=employee_account)
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=admin_account)
        response = client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(employee_account.id)},
            format="json",
        )
        assert response.status_code == 400

    def test_5_membership_does_not_alter_business_owner(self, employee_account, business, admin_account):
        original_owner_id = business.owner_id
        Membership = BusinessMembership.objects.create(
            business=business, user=employee_account
        )
        business.refresh_from_db()
        assert business.owner_id == original_owner_id

    def test_6_employee_account_can_have_membership(self, employee_account, business):
        m = BusinessMembership.objects.create(business=business, user=employee_account)
        assert m.user == employee_account
        assert m.business == business

    def test_7_account_from_another_business_is_not_implicitly_authorized(
        self, employee_account, admin_account, business, db
    ):
        other_biz = Business.objects.create(name="Bisnis Lain", owner=admin_account)
        other_employee = User.objects.create_user(
            email="other_emp@example.com", password="SecurePass123!"
        )
        BusinessMembership.objects.create(
            business=other_biz, user=other_employee
        )
        my_memberships = BusinessMembership.objects.filter(
            user=employee_account
        )
        other_memberships = BusinessMembership.objects.filter(
            user=other_employee
        )
        my_biz_ids = [m.business_id for m in my_memberships]
        other_biz_ids = [m.business_id for m in other_memberships]
        assert other_biz.id not in my_biz_ids
        assert business.id not in other_biz_ids

    def test_8_owner_existing_behavior_remains_intact(self, admin_account, business, db):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=admin_account)
        resp = client.post(f"/api/v1/businesses/", {"name": "Bisnis Baru"}, format="json")
        assert resp.status_code == 201
        other_user = User.objects.create_user(
            email="other@example.com", password="SecurePass123!"
        )
        resp = client.post(
            f"/api/v1/businesses/{business.id}/members/",
            {"user_id": str(other_user.id)},
            format="json",
        )
        assert resp.status_code == 201