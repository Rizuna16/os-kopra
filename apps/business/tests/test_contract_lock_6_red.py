import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from apps.business.models import Business, BusinessMembership, Location
from apps.inventory.models import Batch, Stock
from apps.product.models import Product, Variant
from apps.authentication.permissions import (
    BusinessAccessMixin,
    has_business_permission,
    resolve_business_role,
)

User = get_user_model()


@pytest.fixture
def lock6_users(db):
    owner = User.objects.create_user(email="owner_l6@example.com", password="SecurePass123!")
    admin = User.objects.create_user(email="admin_l6@example.com", password="SecurePass123!")
    kasir = User.objects.create_user(email="kasir_l6@example.com", password="SecurePass123!")
    superuser = User.objects.create_superuser(email="super_l6@example.com", password="SecurePass123!")
    other_owner = User.objects.create_user(email="other_owner_l6@example.com", password="SecurePass123!")
    return {
        "owner": owner,
        "admin": admin,
        "kasir": kasir,
        "superuser": superuser,
        "other_owner": other_owner,
    }


@pytest.fixture
def lock6_business(db, lock6_users):
    b = Business.objects.create(name="Business L6", owner=lock6_users["owner"])
    BusinessMembership.objects.create(business=b, user=lock6_users["admin"], role="ADMIN")
    BusinessMembership.objects.create(business=b, user=lock6_users["kasir"], role="KASIR")
    return b


@pytest.fixture
def lock6_other_business(db, lock6_users):
    return Business.objects.create(name="Business Other L6", owner=lock6_users["other_owner"])


@pytest.fixture
def lock6_location(db, lock6_business):
    return Location.objects.create(business=lock6_business, name="Loc L6")


def get_client(client, user):
    client.logout()
    if "HTTP_AUTHORIZATION" in client.defaults:
        del client.defaults["HTTP_AUTHORIZATION"]
    refresh = RefreshToken.for_user(user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(refresh.access_token)}"
    return client


@pytest.mark.django_db
class TestContractLock6Red:
    # 1. Central Superuser Authorization
    def test_red_6_superuser_has_business_permission(self, lock6_users, lock6_business):
        # Currently, has_business_permission returns False for superuser unless owner/member
        # Contract Lock #6 requires superuser to return True (platform bypass)
        res = has_business_permission(lock6_users["superuser"], lock6_business, "inventory", "create")
        assert res is True, "Superuser must be granted permission via central engine platform bypass"

    # 2. require_object_permission() API
    def test_red_6_require_object_permission_exists(self):
        mixin = BusinessAccessMixin()
        assert hasattr(mixin, "require_object_permission"), (
            "BusinessAccessMixin must provide require_object_permission()"
        )

    # 3. StockDetailView Centralization / Static Inspection
    def test_red_6_inventory_views_no_duplicated_checks(self):
        import inspect
        from apps.inventory import views as inv_views
        source = inspect.getsource(inv_views)
        # Check if manual inline membership checks are still present in inventory views
        assert "business.owner_id != request.user.id" not in source, (
            "Inventory views must not duplicate inline owner/membership checks"
        )

    # 4. Inventory Serializer Centralization
    def test_red_6_inventory_serializers_no_inline_q(self):
        import inspect
        from apps.inventory import serializers as inv_serializers
        source = inspect.getsource(inv_serializers)
        assert "business__owner=request.user" not in source, (
            "Inventory serializers must not use inline Q filters for business ownership"
        )

    # 5. OnlineStore Resolver Centralization
    def test_red_6_onlinestore_no_duplicated_resolver(self):
        import inspect
        from apps.onlinestore import views as os_views
        source = inspect.getsource(os_views)
        assert "_get_business_and_order" not in source or "BusinessAccessMixin" in source, (
            "OnlineStore viewset must use BusinessAccessMixin / centralized resolution"
        )

    # 6. Status-Code Semantics (404 for cross-business, 403 for role-denied)
    def test_red_6_status_code_semantics(self, client, lock6_users, lock6_business, lock6_other_business, lock6_location):
        # Kasir trying to delete location should get 403 or 404
        cl = get_client(client, lock6_users["kasir"])
        r = cl.delete(f"/api/v1/businesses/{lock6_business.id}/locations/{lock6_location.id}/")
        assert r.status_code in (403, 404)

        # Cross business access gets 404
        cl_admin = get_client(client, lock6_users["admin"])
        r2 = cl_admin.get(f"/api/v1/businesses/{lock6_other_business.id}/locations/")
        assert r2.status_code == 404
