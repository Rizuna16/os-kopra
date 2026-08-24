from decimal import Decimal

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
def other_location(db, business):
    return Location.objects.create(business=business, name="Gudang Dome")


@pytest.fixture
def other_business_location(db, other_business):
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
def variant2(db, product):
    return Variant.objects.create(product=product, name="Merah - Besar")


@pytest.mark.django_db
class TestStockListView:
    def test_owner_can_list_stocks(
        self, auth_client, business, location, variant
    ):
        Stock.objects.create(
            location=location, variant=variant, quantity=Decimal("100")
        )
        response = auth_client.get(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
        )
        assert response.status_code == 200

    def test_unauthenticated_returns_401(self, client, business, location):
        response = client.get(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
        )
        assert response.status_code == 401

    def test_non_owner_cannot_list_stocks(
        self, other_auth_client, business, location
    ):
        response = other_auth_client.get(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
        )
        assert response.status_code == 404

    def test_location_from_other_business_returns_404(
        self, auth_client, business, other_business_location
    ):
        response = auth_client.get(
            f"/api/v1/businesses/{business.id}/locations/{other_business_location.id}/stocks/",
        )
        assert response.status_code == 404

    def test_empty_list_returns_200(self, auth_client, business, location):
        response = auth_client.get(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
        )
        assert response.status_code == 200
        assert response.data == []

    def test_only_stocks_of_specified_location_returned(
        self, auth_client, business, location, other_location, variant, variant2
    ):
        Stock.objects.create(
            location=location, variant=variant, quantity=Decimal("100")
        )
        Stock.objects.create(
            location=other_location, variant=variant2, quantity=Decimal("50")
        )
        response = auth_client.get(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/",
        )
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]["location"] == str(location.id)
