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
def location_a(db, business):
    return Location.objects.create(business=business, name="Gudang A")


@pytest.fixture
def location_b(db, business):
    return Location.objects.create(business=business, name="Gudang B")


@pytest.fixture
def product(db, business):
    return Product.objects.create(
        business=business, name="Beras 1kg", price=Decimal("12000")
    )


@pytest.fixture
def variant(db, product):
    return Variant.objects.create(product=product, name="Biru - Kecil")


@pytest.fixture
def source_stock(db, location_a, variant):
    return Stock.objects.create(
        location=location_a, variant=variant, quantity=Decimal("100")
    )


@pytest.fixture
def other_location(db, other_business):
    return Location.objects.create(business=other_business, name="Gudang Lain")


@pytest.fixture
def other_product(db, other_business):
    return Product.objects.create(
        business=other_business, name="Gula 1kg", price=Decimal("9000")
    )


@pytest.fixture
def other_variant(db, other_product):
    return Variant.objects.create(product=other_product, name="Coklat - Besar")


@pytest.mark.django_db
class TestStockTransfer:
    def test_owner_can_transfer_stock(
        self, auth_client, location_a, location_b, variant, source_stock
    ):
        response = auth_client.post(
            "/api/v1/stocks/transfer/",
            {
                "source_location": str(location_a.id),
                "destination_location": str(location_b.id),
                "variant": str(variant.id),
                "quantity": "40",
            },
            content_type="application/json",
        )
        assert response.status_code == 200
        source_stock.refresh_from_db()
        dest = Stock.objects.get(location=location_b, variant=variant)
        assert source_stock.quantity == Decimal("60")
        assert dest.quantity == Decimal("40")
        assert response.data["transferred_quantity"] == "40.00"

    def test_destination_stock_created_if_absent(
        self, auth_client, location_a, location_b, variant, source_stock
    ):
        assert not Stock.objects.filter(location=location_b).exists()
        auth_client.post(
            "/api/v1/stocks/transfer/",
            {
                "source_location": str(location_a.id),
                "destination_location": str(location_b.id),
                "variant": str(variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert Stock.objects.filter(location=location_b, variant=variant).exists()

    def test_quantity_zero_rejected(
        self, auth_client, location_a, location_b, variant, source_stock
    ):
        response = auth_client.post(
            "/api/v1/stocks/transfer/",
            {
                "source_location": str(location_a.id),
                "destination_location": str(location_b.id),
                "variant": str(variant.id),
                "quantity": "0",
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_quantity_negative_rejected(
        self, auth_client, location_a, location_b, variant, source_stock
    ):
        response = auth_client.post(
            "/api/v1/stocks/transfer/",
            {
                "source_location": str(location_a.id),
                "destination_location": str(location_b.id),
                "variant": str(variant.id),
                "quantity": "-5",
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_quantity_exceeds_source_rejected(
        self, auth_client, location_a, location_b, variant, source_stock
    ):
        response = auth_client.post(
            "/api/v1/stocks/transfer/",
            {
                "source_location": str(location_a.id),
                "destination_location": str(location_b.id),
                "variant": str(variant.id),
                "quantity": "1000",
            },
            content_type="application/json",
        )
        assert response.status_code == 400
        source_stock.refresh_from_db()
        assert source_stock.quantity == Decimal("100")

    def test_source_stock_missing_rejected(self, auth_client, location_a, location_b, variant):
        response = auth_client.post(
            "/api/v1/stocks/transfer/",
            {
                "source_location": str(location_a.id),
                "destination_location": str(location_b.id),
                "variant": str(variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_variant_missing_rejected(self, auth_client, location_a, location_b, source_stock):
        response = auth_client.post(
            "/api/v1/stocks/transfer/",
            {
                "source_location": str(location_a.id),
                "destination_location": str(location_b.id),
                "variant": str(uuid4()),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_source_location_missing_rejected(self, auth_client, location_b, variant, source_stock):
        response = auth_client.post(
            "/api/v1/stocks/transfer/",
            {
                "source_location": str(uuid4()),
                "destination_location": str(location_b.id),
                "variant": str(variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_destination_location_missing_rejected(self, auth_client, location_a, variant, source_stock):
        response = auth_client.post(
            "/api/v1/stocks/transfer/",
            {
                "source_location": str(location_a.id),
                "destination_location": str(uuid4()),
                "variant": str(variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_source_equals_destination_rejected(self, auth_client, location_a, variant, source_stock):
        response = auth_client.post(
            "/api/v1/stocks/transfer/",
            {
                "source_location": str(location_a.id),
                "destination_location": str(location_a.id),
                "variant": str(variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_unauthenticated_returns_401(self, client, location_a, location_b, variant, source_stock):
        response = client.post(
            "/api/v1/stocks/transfer/",
            {
                "source_location": str(location_a.id),
                "destination_location": str(location_b.id),
                "variant": str(variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_cross_business_source_returns_404(
        self, auth_client, other_location, location_b, other_variant, source_stock
    ):
        response = auth_client.post(
            "/api/v1/stocks/transfer/",
            {
                "source_location": str(other_location.id),
                "destination_location": str(location_b.id),
                "variant": str(other_variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_cross_business_destination_returns_404(
        self, auth_client, location_a, other_location, variant, source_stock
    ):
        response = auth_client.post(
            "/api/v1/stocks/transfer/",
            {
                "source_location": str(location_a.id),
                "destination_location": str(other_location.id),
                "variant": str(variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_other_user_cannot_access_own_business(
        self, other_auth_client, location_a, location_b, variant, source_stock
    ):
        response = other_auth_client.post(
            "/api/v1/stocks/transfer/",
            {
                "source_location": str(location_a.id),
                "destination_location": str(location_b.id),
                "variant": str(variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 404
        source_stock.refresh_from_db()
        assert source_stock.quantity == Decimal("100")

    def test_other_business_stock_unchanged(
        self, auth_client, location_a, location_b, other_location, variant, source_stock
    ):
        other_stock = Stock.objects.create(
            location=other_location, variant=variant, quantity=Decimal("5")
        )
        auth_client.post(
            "/api/v1/stocks/transfer/",
            {
                "source_location": str(location_a.id),
                "destination_location": str(location_b.id),
                "variant": str(variant.id),
                "quantity": "30",
            },
            content_type="application/json",
        )
        other_stock.refresh_from_db()
        assert other_stock.quantity == Decimal("5")

    def test_variant_and_product_unchanged(
        self, auth_client, location_a, location_b, variant, product, source_stock
    ):
        auth_client.post(
            "/api/v1/stocks/transfer/",
            {
                "source_location": str(location_a.id),
                "destination_location": str(location_b.id),
                "variant": str(variant.id),
                "quantity": "20",
            },
            content_type="application/json",
        )
        variant.refresh_from_db()
        product.refresh_from_db()
        assert Variant.objects.filter(id=variant.id).exists()
        assert Product.objects.filter(id=product.id).exists()
