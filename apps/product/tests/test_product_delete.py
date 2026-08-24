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


@pytest.mark.django_db
class TestProductDeleteView:
    def test_owner_can_delete_product(self, auth_client, business):
        product = Product.objects.create(
            business=business, name="Beras 1kg", price=12000
        )
        response = auth_client.delete(
            f"/api/v1/businesses/{business.id}/products/{product.id}/",
        )
        assert response.status_code == 204
        assert not Product.objects.filter(id=product.id).exists()

    def test_non_owner_cannot_delete_product(
        self, auth_client, other_business
    ):
        product = Product.objects.create(
            business=other_business, name="Gula 1kg", price=9000
        )
        response = auth_client.delete(
            f"/api/v1/businesses/{other_business.id}/products/{product.id}/",
        )
        assert response.status_code == 404
        assert Product.objects.filter(id=product.id).exists()

    def test_product_not_found_returns_404(self, auth_client, business):
        response = auth_client.delete(
            f"/api/v1/businesses/{business.id}/products/{uuid4()}/",
        )
        assert response.status_code == 404

    def test_business_cannot_delete_product_from_another_business(
        self, auth_client, business, other_business
    ):
        product = Product.objects.create(
            business=other_business, name="Gula 1kg", price=9000
        )
        response = auth_client.delete(
            f"/api/v1/businesses/{business.id}/products/{product.id}/",
        )
        assert response.status_code == 404
        assert Product.objects.filter(id=product.id).exists()
