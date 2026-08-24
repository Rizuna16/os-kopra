from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, Location
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
def other_product(db, other_business):
    return Product.objects.create(
        business=other_business, name="Gula 1kg", price=Decimal("9000")
    )


@pytest.fixture
def other_variant(db, other_product):
    return Variant.objects.create(product=other_product, name="Coklat - Besar")


@pytest.mark.django_db
class TestStockCreateView:
    def test_owner_can_create_stock(
        self, auth_client, business, location, variant
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
            {
                "variant_id": str(variant.id),
                "quantity": "100",
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        assert "id" in response.data
        assert "location" in response.data
        assert "variant" in response.data
        assert "quantity" in response.data
        assert "created_at" in response.data
        assert "updated_at" in response.data

    def test_unauthenticated_returns_401(self, client, business, location):
        response = client.post(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
            {
                "variant_id": "00000000-0000-0000-0000-000000000000",
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_non_owner_cannot_create_stock(
        self, other_auth_client, business, location, variant
    ):
        response = other_auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
            {
                "variant_id": str(variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_location_from_other_business_returns_404(
        self, auth_client, business, other_business, other_variant
    ):
        other_location = Location.objects.create(
            business=other_business, name="Gudang Lain"
        )
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/{other_location.id}/stocks/",
            {
                "variant_id": str(other_variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_variant_from_other_business_returns_404(
        self, auth_client, business, location, other_variant
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
            {
                "variant_id": str(other_variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_missing_variant_id_returns_400(
        self, auth_client, business, location
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
            {
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_invalid_variant_id_returns_400(
        self, auth_client, business, location
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
            {
                "variant_id": "not-a-valid-uuid",
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_missing_quantity_returns_400(
        self, auth_client, business, location, variant
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
            {
                "variant_id": str(variant.id),
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_invalid_quantity_returns_400(
        self, auth_client, business, location, variant
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
            {
                "variant_id": str(variant.id),
                "quantity": "not-a-number",
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_zero_quantity_returns_400(
        self, auth_client, business, location, variant
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
            {
                "variant_id": str(variant.id),
                "quantity": "0",
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_negative_quantity_returns_400(
        self, auth_client, business, location, variant
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
            {
                "variant_id": str(variant.id),
                "quantity": "-5",
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_response_contains_correct_location_and_variant(
        self, auth_client, business, location, variant
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
            {
                "variant_id": str(variant.id),
                "quantity": "50",
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["location"] == str(location.id)
        assert response.data["variant"] == str(variant.id)

    def test_duplicate_variant_location_returns_400(
        self, auth_client, business, location, variant
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
            {
                "variant_id": str(variant.id),
                "quantity": "100",
            },
            content_type="application/json",
        )
        assert response.status_code == 201

        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
            {
                "variant_id": str(variant.id),
                "quantity": "50",
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_variant_from_other_product_business_returns_404(
        self, auth_client, business, location, other_variant
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
            {
                "variant_id": str(other_variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 404
