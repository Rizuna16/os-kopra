import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, Location
from apps.inventory.models import Stock
from apps.product.models import Product, Variant

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
def other_tokens(other_user):
    refresh = RefreshToken.for_user(other_user)
    return {"access": str(refresh.access_token)}


@pytest.fixture
def auth_client(client, auth_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {auth_tokens['access']}"
    return client


@pytest.fixture
def other_auth_client(client, other_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {other_tokens['access']}"
    return client


@pytest.fixture
def business(db, user):
    return Business.objects.create(name="Toko Budi", owner=user)


@pytest.fixture
def other_business(db, other_user):
    return Business.objects.create(name="Toko Lain", owner=other_user)


@pytest.fixture
def location(db, business):
    return Location.objects.create(business=business, name="Gudang Utama")


@pytest.fixture
def product(db, business):
    return Product.objects.create(
        business=business, name="Beras 1kg", price="12000"
    )


@pytest.fixture
def variant(db, product):
    return Variant.objects.create(product=product, name="Biru - Kecil")


@pytest.fixture
def stock(db, location, variant):
    return Stock.objects.create(
        location=location, variant=variant, quantity="100"
    )


@pytest.fixture
def other_business_location(db, other_business):
    return Location.objects.create(
        business=other_business, name="Gudang Lain"
    )


@pytest.fixture
def other_variant(db, other_business):
    other_product = Product.objects.create(
        business=other_business, name="Gula 1kg", price="9000"
    )
    return Variant.objects.create(
        product=other_product, name="Coklat - Besar"
    )


@pytest.fixture
def other_stock(db, other_business_location, other_variant):
    return Stock.objects.create(
        location=other_business_location,
        variant=other_variant,
        quantity="50",
    )


@pytest.mark.django_db
class TestStockDeleteView:
    def test_authenticated_user_can_delete_stock(self, auth_client, stock):
        response = auth_client.delete(f"/api/stocks/{stock.id}/")
        assert response.status_code == 204

    def test_deleted_stock_no_longer_exists(self, auth_client, stock):
        auth_client.delete(f"/api/stocks/{stock.id}/")
        assert not Stock.objects.filter(pk=stock.id).exists()

    def test_delete_nonexistent_stock_returns_404(self, auth_client):
        import uuid

        response = auth_client.delete(f"/api/stocks/{uuid.uuid4()}/")
        assert response.status_code == 404

    def test_cross_business_delete_returns_404(
        self, auth_client, other_stock
    ):
        response = auth_client.delete(f"/api/stocks/{other_stock.id}/")
        assert response.status_code == 404

    def test_unauthenticated_delete_returns_401(self, client, stock):
        response = client.delete(f"/api/stocks/{stock.id}/")
        assert response.status_code == 401

    def test_double_delete_returns_404(self, auth_client, stock):
        auth_client.delete(f"/api/stocks/{stock.id}/")
        response = auth_client.delete(f"/api/stocks/{stock.id}/")
        assert response.status_code == 404

    def test_delete_does_not_affect_other_stock(
        self, auth_client, stock, other_stock
    ):
        auth_client.delete(f"/api/stocks/{stock.id}/")
        assert Stock.objects.filter(pk=other_stock.id).exists()
