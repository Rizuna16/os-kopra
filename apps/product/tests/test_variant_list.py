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
def product_a(db, business):
    return Product.objects.create(
        business=business, name="Beras 1kg", price=Decimal("12000")
    )


@pytest.fixture
def product_b(db, business):
    return Product.objects.create(
        business=business, name="Gula 1kg", price=Decimal("9000")
    )


@pytest.fixture
def other_product(db, other_business):
    return Product.objects.create(
        business=other_business, name="Tepung 1kg", price=Decimal("7000")
    )


@pytest.mark.django_db
class TestVariantListView:
    def test_owner_can_list_variants(
        self, auth_client, business, product_a
    ):
        v1 = Variant.objects.create(product=product_a, name="Merah - L")
        v2 = Variant.objects.create(product=product_a, name="Biru - M")
        response = auth_client.get(
            f"/api/v1/businesses/{business.id}/products/{product_a.id}/variants/",
        )
        assert response.status_code == 200
        assert isinstance(response.data, list)
        assert len(response.data) == 2
        returned_ids = {item["id"] for item in response.data}
        assert str(v1.id) in returned_ids
        assert str(v2.id) in returned_ids
        for item in response.data:
            assert "id" in item
            assert "product" in item
            assert "name" in item
            assert item["product"] == str(product_a.id)

    def test_unauthenticated_returns_401(
        self, client, business, product_a
    ):
        response = client.get(
            f"/api/v1/businesses/{business.id}/products/{product_a.id}/variants/",
        )
        assert response.status_code == 401

    def test_non_owner_cannot_list_variants(
        self, auth_client, other_business, other_product
    ):
        response = auth_client.get(
            f"/api/v1/businesses/{other_business.id}/products/{other_product.id}/variants/",
        )
        assert response.status_code == 404

    def test_product_from_other_business_returns_404(
        self, auth_client, business, other_product
    ):
        response = auth_client.get(
            f"/api/v1/businesses/{business.id}/products/{other_product.id}/variants/",
        )
        assert response.status_code == 404

    def test_empty_list_returns_200(
        self, auth_client, business, product_a
    ):
        response = auth_client.get(
            f"/api/v1/businesses/{business.id}/products/{product_a.id}/variants/",
        )
        assert response.status_code == 200
        assert response.data == []

    def test_only_variants_of_specified_product_returned(
        self, auth_client, business, product_a, product_b
    ):
        Variant.objects.create(product=product_a, name="Merah - L")
        Variant.objects.create(product=product_b, name="Putih - M")
        response = auth_client.get(
            f"/api/v1/businesses/{business.id}/products/{product_a.id}/variants/",
        )
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]["name"] == "Merah - L"
        assert response.data[0]["product"] == str(product_a.id)
