from decimal import Decimal
from uuid import uuid4

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
        business=business, name="Beras 1kg", price=Decimal("12000")
    )


@pytest.fixture
def variant(db, product):
    return Variant.objects.create(product=product, name="Biru - Kecil")


@pytest.fixture
def stock(db, location, variant):
    return Stock.objects.create(
        location=location, variant=variant, quantity=Decimal("100")
    )


@pytest.fixture
def other_business_location(db, other_business):
    return Location.objects.create(
        business=other_business, name="Gudang Lain"
    )


@pytest.fixture
def other_variant(db, other_business):
    other_product = Product.objects.create(
        business=other_business, name="Gula 1kg", price=Decimal("9000")
    )
    return Variant.objects.create(
        product=other_product, name="Coklat - Besar"
    )


@pytest.fixture
def other_stock(db, other_business_location, other_variant):
    return Stock.objects.create(
        location=other_business_location,
        variant=other_variant,
        quantity=Decimal("50"),
    )


@pytest.mark.django_db
class TestStockUpdateView:
    def test_authenticated_user_can_update_stock(self, auth_client, stock):
        response = auth_client.patch(
            f"/api/stocks/{stock.id}/",
            {"quantity": "200"},
            content_type="application/json",
        )
        assert response.status_code == 200

    def test_update_returns_correct_updated_data(self, auth_client, stock):
        response = auth_client.patch(
            f"/api/stocks/{stock.id}/",
            {"quantity": "250"},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.data["quantity"] is not None
        stock.refresh_from_db()
        assert stock.quantity == Decimal("250")

    def test_stock_not_found_returns_404(self, auth_client):
        response = auth_client.patch(
            f"/api/stocks/{uuid4()}/",
            {"quantity": "200"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_cross_business_access_returns_404(
        self, auth_client, other_stock
    ):
        response = auth_client.patch(
            f"/api/stocks/{other_stock.id}/",
            {"quantity": "200"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, stock):
        response = client.patch(
            f"/api/stocks/{stock.id}/",
            {"quantity": "200"},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_read_only_fields_cannot_be_modified(
        self, auth_client, stock, location, variant
    ):
        original_id = str(stock.id)
        original_location = str(location.id)
        original_variant = str(variant.id)

        response = auth_client.patch(
            f"/api/stocks/{stock.id}/",
            {
                "quantity": "200",
                "id": str(uuid4()),
                "location": str(uuid4()),
                "variant": str(uuid4()),
                "created_at": "2020-01-01T00:00:00Z",
                "updated_at": "2020-01-01T00:00:00Z",
            },
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.data["id"] == original_id
        assert response.data["location"] == original_location
        assert response.data["variant"] == original_variant
        stock.refresh_from_db()
        assert str(stock.id) == original_id
        assert str(stock.location_id) == original_location
        assert str(stock.variant_id) == original_variant

    def test_get_not_used_for_update(self, auth_client, stock):
        response = auth_client.get(
            f"/api/stocks/{stock.id}/",
        )
        assert response.status_code == 200
        assert response.data["id"] == str(stock.id)
