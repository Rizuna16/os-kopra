from decimal import Decimal

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
class TestProductListView:
    def test_owner_can_list_products(self, auth_client, business):
        Product.objects.create(
            business=business, name="Beras 1kg", price=Decimal("12000")
        )
        Product.objects.create(
            business=business, name="Gula 1kg", price=Decimal("9000")
        )
        response = auth_client.get(
            f"/api/v1/businesses/{business.id}/products/",
        )
        assert response.status_code == 200
        assert isinstance(response.data, list)
        assert len(response.data) == 2
        for item in response.data:
            for field in ("id", "name", "price", "business"):
                assert field in item
            assert item["business"] == str(business.id)

    def test_products_from_other_business_not_returned(
        self, auth_client, business, other_business
    ):
        mine = Product.objects.create(
            business=business, name="Beras 1kg", price=Decimal("12000")
        )
        theirs = Product.objects.create(
            business=other_business, name="Gula 1kg", price=Decimal("9000")
        )
        response = auth_client.get(
            f"/api/v1/businesses/{business.id}/products/",
        )
        assert response.status_code == 200
        returned_ids = [item["id"] for item in response.data]
        assert str(mine.id) in returned_ids
        assert str(theirs.id) not in returned_ids

    def test_non_owner_cannot_list_products(
        self, auth_client, other_business
    ):
        response = auth_client.get(
            f"/api/v1/businesses/{other_business.id}/products/",
        )
        assert response.status_code == 404
