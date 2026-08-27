import pytest
import inspect
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import PermissionDenied, NotFound

from apps.business.models import Business, BusinessMembership, Location
from apps.inventory.models import Batch, SerialNumber, Stock
from apps.product.models import Product, Variant
from apps.authentication.permissions import (
    BusinessAccessMixin,
    has_business_permission,
    resolve_business_role,
)
from apps.inventory import views as inventory_views
from apps.inventory import serializers as inventory_serializers

User = get_user_model()


@pytest.fixture
def red6_users(db):
    owner = User.objects.create_user(email="owner_r6@example.com", password="SecurePass123!")
    admin = User.objects.create_user(email="admin_r6@example.com", password="SecurePass123!")
    kasir = User.objects.create_user(email="kasir_r6@example.com", password="SecurePass123!")
    superuser = User.objects.create_superuser(email="super_r6@example.com", password="SecurePass123!")
    other_owner = User.objects.create_user(email="other_owner_r6@example.com", password="SecurePass123!")
    return {
        "owner": owner,
        "admin": admin,
        "kasir": kasir,
        "superuser": superuser,
        "other_owner": other_owner,
    }


@pytest.fixture
def red6_business(db, red6_users):
    b = Business.objects.create(name="Business Red 6", owner=red6_users["owner"])
    BusinessMembership.objects.create(business=b, user=red6_users["admin"], role="ADMIN")
    BusinessMembership.objects.create(business=b, user=red6_users["kasir"], role="KASIR")
    return b


@pytest.fixture
def red6_other_business(db, red6_users):
    return Business.objects.create(name="Business Other Red 6", owner=red6_users["other_owner"])


@pytest.fixture
def red6_location(db, red6_business):
    return Location.objects.create(business=red6_business, name="Location Red 6")


def get_client(client, user):
    client.logout()
    if "HTTP_AUTHORIZATION" in client.defaults:
        del client.defaults["HTTP_AUTHORIZATION"]
    refresh = RefreshToken.for_user(user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(refresh.access_token)}"
    return client


@pytest.mark.django_db
class TestContractLock6InventoryRed:
    # 1. Central Superuser Authorization
    def test_red_superuser_has_business_permission(self, red6_users, red6_business):
        # Superuser must resolve True via centralized authorization engine platform bypass
        assert has_business_permission(red6_users["superuser"], red6_business, "inventory", "create") is True

    def test_red_superuser_not_represented_as_owner_membership(self, red6_users, red6_business):
        # Super Admin must NOT be represented as BusinessMembership.role=OWNER
        role = resolve_business_role(red6_users["superuser"], red6_business)
        assert role is None
        assert not BusinessMembership.objects.filter(business=red6_business, user=red6_users["superuser"]).exists()

    # 2. require_object_permission() API
    def test_red_require_object_permission_exists(self):
        mixin = BusinessAccessMixin()
        assert hasattr(mixin, "require_object_permission"), (
            "BusinessAccessMixin must provide require_object_permission(business, domain, action)"
        )

    # 3. Stock Detail Consolidation (Static & Structural Anti-Duplication)
    def test_red_stock_detail_no_inline_authorization(self):
        source = inspect.getsource(inventory_views.StockDetailView)
        assert "is_superuser" not in source, "StockDetailView must not contain inline superuser checks"
        assert "owner_id != request.user.id" not in source, "StockDetailView must not contain inline owner checks"

    def test_red_stock_transfer_no_inline_authorization(self):
        source = inspect.getsource(inventory_views.StockTransferView)
        assert "is_superuser" not in source, "StockTransferView must not contain inline superuser checks"
        assert "owner_id != request.user.id" not in source, "StockTransferView must not contain inline owner checks"

    def test_red_stock_adjustment_no_inline_authorization(self):
        source = inspect.getsource(inventory_views.StockAdjustmentView)
        assert "is_superuser" not in source, "StockAdjustmentView must not contain inline superuser checks"

    def test_red_batch_detail_no_inline_authorization(self):
        source = inspect.getsource(inventory_views.BatchDetailView)
        assert "is_superuser" not in source, "BatchDetailView must not contain inline superuser checks"

    def test_red_serial_detail_no_inline_authorization(self):
        source = inspect.getsource(inventory_views.SerialNumberDetailView)
        assert "is_superuser" not in source, "SerialNumberDetailView must not contain inline superuser checks"

    # 4. Inventory Serializer Centralization
    def test_red_inventory_serializers_no_inline_owner_membership_q(self):
        source = inspect.getsource(inventory_serializers)
        assert "business__owner=request.user" not in source, (
            "Inventory serializers must not use inline Q filters for business ownership"
        )
        assert "memberships__user=request.user" not in source, (
            "Inventory serializers must not use inline membership filters"
        )

    # 5. get_user_allowed_businesses membership query centralization
    def test_red_get_user_allowed_businesses_centralized_query(self):
        source = inspect.getsource(inventory_views.get_user_allowed_businesses)
        # Should rely on centralized membership/business visibility helper rather than second raw resolver
        assert "Business.objects.filter" not in source or "has_business_permission" in source

    # 8. Static Anti-Duplication Check across inventory views
    def test_red_inventory_views_no_duplicate_auth_blocks(self):
        source = inspect.getsource(inventory_views)
        # Check that repeated manual membership/owner blocks are absent
        assert source.count("business.owner_id != request.user.id") == 0
