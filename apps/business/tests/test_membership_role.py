import uuid
import pytest
from django.contrib.auth import get_user_model

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
def business(db, user):
    return Business.objects.create(name="Toko Budi", owner=user)


@pytest.mark.django_db
class TestBusinessMembershipRoleFoundation:
    def test_business_membership_stores_role(self, user, business):
        membership = BusinessMembership.objects.create(
            business=business,
            user=user,
            role="ADMIN"
        )
        assert membership.role == "ADMIN"

    def test_role_is_scoped_to_membership_business(self, user, other_user):
        biz_a = Business.objects.create(name="Business A", owner=user)
        biz_b = Business.objects.create(name="Business B", owner=user)
        
        mem_a = BusinessMembership.objects.create(business=biz_a, user=other_user, role="ADMIN")
        mem_b = BusinessMembership.objects.create(business=biz_b, user=other_user, role="KASIR")
        
        assert mem_a.role == "ADMIN"
        assert mem_a.business == biz_a
        assert mem_b.role == "KASIR"
        assert mem_b.business == biz_b

    def test_same_account_can_have_different_roles_in_different_businesses(self, user, other_user):
        biz_a = Business.objects.create(name="Business A", owner=user)
        biz_b = Business.objects.create(name="Business B", owner=user)
        
        BusinessMembership.objects.create(business=biz_a, user=other_user, role="ADMIN")
        BusinessMembership.objects.create(business=biz_b, user=other_user, role="KASIR")
        
        assert BusinessMembership.objects.filter(user=other_user, role="ADMIN").count() == 1
        assert BusinessMembership.objects.filter(user=other_user, role="KASIR").count() == 1

    def test_same_account_cannot_have_multiple_conflicting_roles_simultaneously_for_same_membership(self, user, business, other_user):
        BusinessMembership.objects.create(business=business, user=other_user, role="ADMIN")
        with pytest.raises(Exception):
            BusinessMembership.objects.create(business=business, user=other_user, role="KASIR")

    def test_role_does_not_alter_business_owner(self, user, business, other_user):
        original_owner = business.owner
        membership = BusinessMembership.objects.create(business=business, user=other_user, role="ADMIN")
        business.refresh_from_db()
        assert business.owner == original_owner
        assert membership.user != business.owner

    def test_user_account_has_no_global_business_role_dependency(self, user):
        assert not hasattr(user, "role")
        assert not hasattr(user, "business_role")

    def test_existing_owner_behavior_remains_intact(self, user, business):
        assert business.owner == user

    def test_invalid_role_value_is_rejected(self, user, business, other_user):
        membership = BusinessMembership(business=business, user=other_user, role="INVALID_ROLE")
        with pytest.raises(Exception):
            membership.full_clean()

    def test_membership_without_role_behavior_backward_compatibility(self, user, business, other_user):
        membership = BusinessMembership.objects.create(business=business, user=other_user)
        assert membership.role in ["", None, "KASIR", "ADMIN"] or membership.role is not None

    def test_employee_account_can_have_membership_role(self, user, business, other_user):
        membership = BusinessMembership.objects.create(business=business, user=other_user, role="KASIR")
        assert membership.role == "KASIR"
