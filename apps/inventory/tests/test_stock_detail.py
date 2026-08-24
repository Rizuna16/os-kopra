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


@pytest.mark.django_db
class TestStockDetailView:
    def test_authenticated_user_can_get_stock(self, auth_client, stock):
        response = auth_client.get(
            f"/api/stocks/{stock.id}/",
        )
        assert response.status_code == 200

    def test_response_contains_correct_stock_data(
        self, auth_client, stock, location, variant
    ):
        response = auth_client.get(
            f"/api/stocks/{stock.id}/",
        )
        assert response.status_code == 200
        assert response.data["id"] == str(stock.id)
        assert response.data["location"] == str(location.id)
        assert response.data["variant"] == str(variant.id)
        assert "quantity" in response.data
        assert "created_at" in response.data
        assert "updated_at" in response.data

    def test_stock_not_found_returns_404(self, auth_client):
        response = auth_client.get(
            f"/api/stocks/{uuid4()}/",
        )
        assert response.status_code == 404

    def test_cross_business_access_returns_404(self, other_auth_client, stock):
        response = other_auth_client.get(
            f"/api/stocks/{stock.id}/",
        )
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, stock):
        response = client.get(
            f"/api/stocks/{stock.id}/",
        )
        assert response.status_code == 401
