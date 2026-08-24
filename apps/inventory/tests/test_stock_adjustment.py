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
def other_location(db, other_business):
    return Location.objects.create(business=other_business, name="Gudang Lain")


@pytest.fixture
def product(db, business):
    return Product.objects.create(
        business=business, name="Beras 1kg", price=Decimal("12000")
    )


@pytest.fixture
def variant(db, product):
    return Variant.objects.create(product=product, name="Biru - Kecil")


@pytest.fixture
def other_product(db, other_business):
    return Product.objects.create(
        business=other_business, name="Gula 1kg", price=Decimal("9000")
    )


@pytest.fixture
def other_variant(db, other_product):
    return Variant.objects.create(product=other_product, name="Coklat - Besar")


@pytest.fixture
def stock(db, location, variant):
    return Stock.objects.create(
        location=location, variant=variant, quantity=Decimal("10")
    )


def _post(client, payload):
    return client.post(
        "/api/v1/stocks/adjustment/",
        payload,
        content_type="application/json",
    )


@pytest.mark.django_db
class TestStockAdjustment:
    def test_unauthenticated_returns_401(self, client, location, variant, stock):
        response = _post(
            client,
            {
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "5",
            },
        )
        assert response.status_code == 401

    def test_positive_adjustment_increases_quantity(
        self, auth_client, location, variant, stock
    ):
        response = _post(
            auth_client,
            {
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "3",
            },
        )
        assert response.status_code == 200
        stock.refresh_from_db()
        assert stock.quantity == Decimal("13")

    def test_positive_adjustment_on_missing_stock_creates(
        self, auth_client, location, variant
    ):
        assert not Stock.objects.filter(location=location, variant=variant).exists()
        response = _post(
            auth_client,
            {
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "7",
            },
        )
        assert response.status_code == 200
        new = Stock.objects.get(location=location, variant=variant)
        assert new.quantity == Decimal("7")

    def test_negative_adjustment_decreases_quantity(
        self, auth_client, location, variant, stock
    ):
        response = _post(
            auth_client,
            {
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "-4",
            },
        )
        assert response.status_code == 200
        stock.refresh_from_db()
        assert stock.quantity == Decimal("6")

    def test_negative_result_rejected(
        self, auth_client, location, variant, stock
    ):
        response = _post(
            auth_client,
            {
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "-20",
            },
        )
        assert response.status_code == 400
        stock.refresh_from_db()
        assert stock.quantity == Decimal("10")

    def test_negative_adjustment_on_missing_stock_rejected(
        self, auth_client, location, variant
    ):
        response = _post(
            auth_client,
            {
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "-5",
            },
        )
        assert response.status_code == 400
        assert not Stock.objects.filter(location=location, variant=variant).exists()

    def test_zero_quantity_rejected(
        self, auth_client, location, variant, stock
    ):
        response = _post(
            auth_client,
            {
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "0",
            },
        )
        assert response.status_code == 400

    def test_invalid_quantity_rejected(
        self, auth_client, location, variant, stock
    ):
        response = _post(
            auth_client,
            {
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "abc",
            },
        )
        assert response.status_code == 400

    def test_location_missing_rejected(self, auth_client, variant, stock):
        response = _post(
            auth_client,
            {
                "location": str(uuid4()),
                "variant": str(variant.id),
                "quantity": "2",
            },
        )
        assert response.status_code == 404

    def test_variant_missing_rejected(self, auth_client, location, stock):
        response = _post(
            auth_client,
            {
                "location": str(location.id),
                "variant": str(uuid4()),
                "quantity": "2",
            },
        )
        assert response.status_code == 404

    def test_cross_business_location_rejected(
        self, auth_client, other_location, variant, stock
    ):
        response = _post(
            auth_client,
            {
                "location": str(other_location.id),
                "variant": str(variant.id),
                "quantity": "2",
            },
        )
        assert response.status_code == 404

    def test_cross_business_variant_rejected(
        self, auth_client, location, other_variant, stock
    ):
        response = _post(
            auth_client,
            {
                "location": str(location.id),
                "variant": str(other_variant.id),
                "quantity": "2",
            },
        )
        assert response.status_code == 404

    def test_location_variant_mismatch_rejected(
        self, auth_client, other_location, other_variant
    ):
        response = _post(
            auth_client,
            {
                "location": str(other_location.id),
                "variant": str(other_variant.id),
                "quantity": "2",
            },
        )
        assert response.status_code == 404

    def test_other_user_cannot_adjust_own_business(
        self, other_auth_client, location, variant, stock
    ):
        response = _post(
            other_auth_client,
            {
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "5",
            },
        )
        assert response.status_code == 404
        stock.refresh_from_db()
        assert stock.quantity == Decimal("10")

    def test_other_business_stock_unchanged(
        self, auth_client, location, variant, stock, other_location, other_variant
    ):
        other_stock = Stock.objects.create(
            location=other_location, variant=other_variant, quantity=Decimal("5")
        )
        _post(
            auth_client,
            {
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "5",
            },
        )
        other_stock.refresh_from_db()
        assert other_stock.quantity == Decimal("5")

    def test_product_and_variant_unchanged(
        self, auth_client, location, variant, product, stock
    ):
        _post(
            auth_client,
            {
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "5",
            },
        )
        assert Variant.objects.filter(id=variant.id).exists()
        assert Product.objects.filter(id=product.id).exists()
        assert variant.product_id == product.id
