import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, Location, BusinessMembership
from apps.product.models import Product, Variant
from apps.inventory.models import Stock

User = get_user_model()


def _url(business_id):
    return f"/api/v1/businesses/{business_id}/reports/inventory/"


@pytest.fixture
def inventory_dataset(db, business):
    loc = Location.objects.create(business=business, name="Store A")
    p1 = Product.objects.create(business=business, name="Baju", price="1000.00")
    v1 = Variant.objects.create(product=p1, name="M")
    p2 = Product.objects.create(business=business, name="Celana", price="500.00")
    v2 = Variant.objects.create(product=p2, name="L")
    Stock.objects.create(location=loc, variant=v1, quantity="10.00")
    Stock.objects.create(location=loc, variant=v2, quantity="0.00")
    return business


@pytest.fixture
def kasir_user(db, business):
    u = User.objects.create_user(email="kasir_inv@example.com", password="SecurePass123!")
    BusinessMembership.objects.create(business=business, user=u, role="KASIR")
    return u


@pytest.fixture
def kasir_client(client, kasir_user):
    refresh = RefreshToken.for_user(kasir_user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(refresh.access_token)}"
    return client


@pytest.mark.django_db
class TestInventoryReport:
    # A. Authentication
    def test_inventory_requires_authentication(self, client, business):
        r = client.get(_url(business.id))
        assert r.status_code in (401, 403), r.status_code

    # B. Authorization (owner / reports:view)
    def test_owner_can_access_inventory(self, auth_client, business, inventory_dataset):
        r = auth_client.get(_url(business.id))
        assert r.status_code == 200, r.status_code

    # C. Response contract
    def test_inventory_response_shape(self, auth_client, business, inventory_dataset):
        r = auth_client.get(_url(business.id))
        assert r.status_code == 200, r.status_code
        for key in (
            "total_products",
            "total_variants",
            "total_stock_quantity",
            "low_stock_count",
            "inventory_value",
        ):
            assert key in r.data

    # D. Aggregation correctness
    def test_inventory_aggregation(self, auth_client, business, inventory_dataset):
        r = auth_client.get(_url(business.id))
        assert r.status_code == 200, r.status_code
        assert r.data["total_products"] == 2
        assert r.data["total_variants"] == 2
        assert isinstance(r.data["total_stock_quantity"], (int, float))
        assert r.data["total_stock_quantity"] == 10
        assert isinstance(r.data["inventory_value"], str)

    # E. Tenant isolation (owner own=200; other business=404)
    def test_cross_business_isolation(self, auth_client, business, other_business, inventory_dataset):
        own = auth_client.get(_url(business.id))
        assert own.status_code == 200, own.status_code
        other = auth_client.get(_url(other_business.id))
        assert other.status_code == 404, other.status_code

    # F. RBAC: KASIR denied (reports:view False)
    def test_kasir_denied_reports_view(self, kasir_client, business, inventory_dataset):
        r = kasir_client.get(_url(business.id))
        assert r.status_code == 403, r.status_code

    # G. Read-only
    def test_no_write_endpoint(self, auth_client, business):
        r = auth_client.post(_url(business.id), data={}, content_type="application/json")
        assert r.status_code in (404, 405), r.status_code
