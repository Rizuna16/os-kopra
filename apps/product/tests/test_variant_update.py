from decimal import Decimal
from uuid import uuid4

from rest_framework_simplejwt.tokens import RefreshToken

import pytest
from django.contrib.auth import get_user_model

from apps.business.models import Business
from apps.product.models import Product, Variant

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="owner@example.com",
        password="SecurePass123!",
        first_name="Owner",
        last_name="User",
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="other@example.com",
        password="SecurePass123!",
        first_name="Other",
        last_name="User",
    )


@pytest.fixture
def auth_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token)}


@pytest.fixture
def auth_client(client, auth_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {auth_tokens['access']}"
    return client


@pytest.fixture
def business(db, user):
    return Business.objects.create(name="Toko A", owner=user)


@pytest.fixture
def other_business(db, other_user):
    return Business.objects.create(name="Toko B", owner=other_user)


@pytest.fixture
def product(db, business):
    return Product.objects.create(
        business=business, name="Beras 1kg", price=Decimal("12000")
    )


@pytest.fixture
def other_product(db, business):
    return Product.objects.create(
        business=business, name="Gula 1kg", price=Decimal("9000")
    )


@pytest.fixture
def other_business_product(db, other_business):
    return Product.objects.create(
        business=other_business, name="Tepung 1kg", price=Decimal("7000")
    )


@pytest.mark.django_db
class TestVariantUpdateView:
    def test_owner_can_update_name(
        self, auth_client, business, product
    ):
        variant = Variant.objects.create(product=product, name="Merah - L")
        response = auth_client.patch(
            f"/api/v1/businesses/{business.id}/products/{product.id}/variants/{variant.id}/",
            {"name": "Biru - M"},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.data["name"] == "Biru - M"
        assert response.data["product"] == str(product.id)
        variant.refresh_from_db()
        assert variant.name == "Biru - M"

    def test_unauthenticated_returns_401(
        self, client, business, product
    ):
        variant = Variant.objects.create(product=product, name="Merah - L")
        response = client.patch(
            f"/api/v1/businesses/{business.id}/products/{product.id}/variants/{variant.id}/",
            {"name": "Biru - M"},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_non_owner_cannot_update_variant(
        self, auth_client, other_business, other_business_product
    ):
        variant = Variant.objects.create(
            product=other_business_product, name="Merah - L"
        )
        response = auth_client.patch(
            f"/api/v1/businesses/{other_business.id}/products/{other_business_product.id}/variants/{variant.id}/",
            {"name": "Biru - M"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_product_from_other_business_returns_404(
        self, auth_client, business, other_business_product
    ):
        variant = Variant.objects.create(
            product=other_business_product, name="Merah - L"
        )
        response = auth_client.patch(
            f"/api/v1/businesses/{business.id}/products/{other_business_product.id}/variants/{variant.id}/",
            {"name": "Biru - M"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_variant_not_found_returns_404(
        self, auth_client, business, product
    ):
        response = auth_client.patch(
            f"/api/v1/businesses/{business.id}/products/{product.id}/variants/{uuid4()}/",
            {"name": "Biru - M"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_variant_from_other_product_returns_404(
        self, auth_client, business, product, other_product
    ):
        variant = Variant.objects.create(product=other_product, name="Putih - M")
        response = auth_client.patch(
            f"/api/v1/businesses/{business.id}/products/{product.id}/variants/{variant.id}/",
            {"name": "Biru - M"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_partial_update_without_name_keeps_data(
        self, auth_client, business, product
    ):
        variant = Variant.objects.create(product=product, name="Merah - L")
        response = auth_client.patch(
            f"/api/v1/businesses/{business.id}/products/{product.id}/variants/{variant.id}/",
            {},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.data["name"] == "Merah - L"
        variant.refresh_from_db()
        assert variant.name == "Merah - L"

    def test_whitespace_only_name_rejected(
        self, auth_client, business, product
    ):
        variant = Variant.objects.create(product=product, name="Merah - L")
        response = auth_client.patch(
            f"/api/v1/businesses/{business.id}/products/{product.id}/variants/{variant.id}/",
            {"name": "   "},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_product_relationship_not_movable(
        self, auth_client, business, product, other_product
    ):
        variant = Variant.objects.create(product=product, name="Merah - L")
        response = auth_client.patch(
            f"/api/v1/businesses/{business.id}/products/{product.id}/variants/{variant.id}/",
            {"product": str(other_product.id), "name": "Biru - M"},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.data["product"] == str(product.id)
        variant.refresh_from_db()
        assert variant.product == product
