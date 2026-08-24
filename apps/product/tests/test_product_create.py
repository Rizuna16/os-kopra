from rest_framework_simplejwt.tokens import RefreshToken
from decimal import Decimal

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


@pytest.mark.django_db
class TestProductCreateView:
    def test_owner_can_create_product(self, auth_client, business, user):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/products/",
            {"name": "Beras 1kg", "price": "12.000"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert "id" in response.data
        assert response.data["name"] == "Beras 1kg"
        assert response.data["business"] == str(business.id)
        assert response.data["price"] == 12000
        product = Product.objects.get(id=response.data["id"])
        assert product.business == business
        assert product.price == Decimal("12000")

    def test_create_product_price_required(self, auth_client, business):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/products/",
            {"name": "Beras 1kg"},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_negative_price_rejected(self, auth_client, business):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/products/",
            {"name": "Beras 1kg", "price": "-12.000"},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert Product.objects.count() == 0

    def test_whitespace_only_name_rejected(self, auth_client, business):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/products/",
            {"name": "   ", "price": "12.000"},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert Product.objects.count() == 0

    def test_valid_price_not_affected(self, auth_client, business, user):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/products/",
            {"name": "Beras 1kg", "price": "12.000"},
            content_type="application/json",
        )
        assert response.status_code == 201
        product = Product.objects.get(id=response.data["id"])
        assert product.price == Decimal("12000")
