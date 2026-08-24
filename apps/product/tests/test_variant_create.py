from decimal import Decimal
from uuid import uuid4

from rest_framework_simplejwt.tokens import RefreshToken

import pytest
from django.contrib.auth import get_user_model

from apps.business.models import Business
from apps.product.models import Product

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
def other_product(db, other_business):
    return Product.objects.create(
        business=other_business, name="Gula 1kg", price=Decimal("9000")
    )


@pytest.mark.django_db
class TestVariantCreateView:
    def test_owner_can_create_variant(self, auth_client, business, product):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/products/{product.id}/variants/",
            {"name": "Merah - L"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert "id" in response.data
        assert response.data["product"] == str(product.id)
        assert response.data["name"] == "Merah - L"

    def test_create_variant_name_required(
        self, auth_client, business, product
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/products/{product.id}/variants/",
            {},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_whitespace_only_name_rejected(
        self, auth_client, business, product
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/products/{product.id}/variants/",
            {"name": "   "},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_non_owner_cannot_create_variant(
        self, auth_client, other_business, other_product
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{other_business.id}/products/{other_product.id}/variants/",
            {"name": "Merah - L"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_product_from_other_business_cannot_create_variant(
        self, auth_client, other_business, other_product
    ):
        response = auth_client.post(
            f"/api/v1/businesses/{other_business.id}/products/{other_product.id}/variants/",
            {"name": "Merah - L"},
            content_type="application/json",
        )
        assert response.status_code == 404
