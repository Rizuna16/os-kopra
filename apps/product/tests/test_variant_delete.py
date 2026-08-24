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
class TestVariantDeleteView:
    def test_owner_can_delete_variant(
        self, auth_client, business, product
    ):
        variant = Variant.objects.create(product=product, name="Merah - L")
        response = auth_client.delete(
            f"/api/v1/businesses/{business.id}/products/{product.id}/variants/{variant.id}/",
        )
        assert response.status_code == 204
        assert not Variant.objects.filter(id=variant.id).exists()

    def test_unauthenticated_returns_401(
        self, client, business, product
    ):
        variant = Variant.objects.create(product=product, name="Merah - L")
        response = client.delete(
            f"/api/v1/businesses/{business.id}/products/{product.id}/variants/{variant.id}/",
        )
        assert response.status_code == 401

    def test_non_owner_cannot_delete_variant(
        self, auth_client, other_business, other_business_product
    ):
        variant = Variant.objects.create(
            product=other_business_product, name="Merah - L"
        )
        response = auth_client.delete(
            f"/api/v1/businesses/{other_business.id}/products/{other_business_product.id}/variants/{variant.id}/",
        )
        assert response.status_code == 404
        assert Variant.objects.filter(id=variant.id).exists()

    def test_product_from_other_business_returns_404(
        self, auth_client, business, other_business_product
    ):
        variant = Variant.objects.create(
            product=other_business_product, name="Merah - L"
        )
        response = auth_client.delete(
            f"/api/v1/businesses/{business.id}/products/{other_business_product.id}/variants/{variant.id}/",
        )
        assert response.status_code == 404
        assert Variant.objects.filter(id=variant.id).exists()

    def test_variant_not_found_returns_404(
        self, auth_client, business, product
    ):
        response = auth_client.delete(
            f"/api/v1/businesses/{business.id}/products/{product.id}/variants/{uuid4()}/",
        )
        assert response.status_code == 404

    def test_variant_from_other_product_returns_404(
        self, auth_client, business, product, other_product
    ):
        variant = Variant.objects.create(product=other_product, name="Putih - M")
        response = auth_client.delete(
            f"/api/v1/businesses/{business.id}/products/{product.id}/variants/{variant.id}/",
        )
        assert response.status_code == 404
        assert Variant.objects.filter(id=variant.id).exists()

    def test_variant_from_other_business_returns_404(
        self, auth_client, business, product, other_business_product
    ):
        variant = Variant.objects.create(
            product=other_business_product, name="Putih - M"
        )
        response = auth_client.delete(
            f"/api/v1/businesses/{business.id}/products/{product.id}/variants/{variant.id}/",
        )
        assert response.status_code == 404
        assert Variant.objects.filter(id=variant.id).exists()

    def test_deleted_variant_not_retrievable(
        self, auth_client, business, product
    ):
        variant = Variant.objects.create(product=product, name="Merah - L")
        auth_client.delete(
            f"/api/v1/businesses/{business.id}/products/{product.id}/variants/{variant.id}/",
        )
        response = auth_client.get(
            f"/api/v1/businesses/{business.id}/products/{product.id}/variants/{variant.id}/",
        )
        assert response.status_code == 404
