import pytest
import inspect
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, BusinessMembership, Location
from apps.onlinestore.models import OnlineStore, OnlineOrder
from apps.authentication.permissions import (
    BusinessAccessMixin,
    has_business_permission,
)
from apps.onlinestore import views as onlinestore_views

User = get_user_model()


@pytest.fixture
def os_red6_users(db):
    owner = User.objects.create_user(email="os_owner_r6@example.com", password="SecurePass123!")
    admin = User.objects.create_user(email="os_admin_r6@example.com", password="SecurePass123!")
    kasir = User.objects.create_user(email="os_kasir_r6@example.com", password="SecurePass123!")
    superuser = User.objects.create_superuser(email="os_super_r6@example.com", password="SecurePass123!")
    return {
        "owner": owner,
        "admin": admin,
        "kasir": kasir,
        "superuser": superuser,
    }


@pytest.fixture
def os_red6_business(db, os_red6_users):
    b = Business.objects.create(name="OS Business Red 6", owner=os_red6_users["owner"])
    BusinessMembership.objects.create(business=b, user=os_red6_users["admin"], role="ADMIN")
    BusinessMembership.objects.create(business=b, user=os_red6_users["kasir"], role="KASIR")
    return b


@pytest.fixture
def os_red6_store(db, os_red6_business):
    loc = Location.objects.create(business=os_red6_business, name="OS Loc")
    return OnlineStore.objects.create(
        business=os_red6_business,
        name="OS Store Red 6",
        slug="os-store-red-6",
        default_location=loc,
    )


@pytest.mark.django_db
class TestContractLock6OnlineStoreRed:
    # 7. Online Store Order Resolver Consolidation (_get_business_and_order)
    def test_red_onlinestore_status_view_no_inline_authorization(self):
        source = inspect.getsource(onlinestore_views.OnlineOrderStatusView)
        assert "is_superuser" not in source, "OnlineOrderStatusView must not contain inline superuser checks"
        assert "Business.objects.filter(" not in source or "BusinessAccessMixin" in source, (
            "OnlineOrderStatusView._get_business_and_order must use BusinessAccessMixin / canonical resolution"
        )

    def test_red_onlinestore_viewset_no_inline_authorization(self):
        source = inspect.getsource(onlinestore_views.OnlineOrderViewSet)
        assert "is_superuser" not in source, "OnlineOrderViewSet must not contain inline superuser checks"

    # Superuser authorization in onlinestore domain via central engine
    def test_red_onlinestore_superuser_permission(self, os_red6_users, os_red6_business):
        assert has_business_permission(os_red6_users["superuser"], os_red6_business, "onlinestore", "update") is True
