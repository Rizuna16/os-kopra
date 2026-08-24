from datetime import date

from decimal import Decimal
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, Location
from apps.inventory.models import Batch, Stock
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
def other_location(db, other_business):
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
def other_product(db, other_business):
    return Product.objects.create(
        business=other_business, name="Gula 1kg", price=Decimal("9000")
    )


@pytest.fixture
def other_variant(db, other_product):
    return Variant.objects.create(product=other_product, name="Coklat - Besar")


@pytest.fixture
def batch(db, location, variant):
    return Batch.objects.create(
        code="BATCH-001", location=location, variant=variant, quantity=Decimal("10")
    )


def _url(suffix=""):
    return f"/api/v1/inventory/batches/{suffix}"


@pytest.mark.django_db
class TestExpiredDateCreate:
    def test_create_batch_without_expired_date(self, auth_client, location, variant):
        response = auth_client.post(
            _url(),
            {
                "code": "BATCH-001",
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["expired_date"] is None

    def test_create_batch_with_expired_date(self, auth_client, location, variant):
        response = auth_client.post(
            _url(),
            {
                "code": "BATCH-002",
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "10",
                "expired_date": "2026-12-31",
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["expired_date"] == "2026-12-31"

    def test_invalid_date_rejected(self, auth_client, location, variant):
        response = auth_client.post(
            _url(),
            {
                "code": "BATCH-003",
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "10",
                "expired_date": "not-a-date",
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_unauthenticated_returns_401(self, client, location, variant):
        response = client.post(
            _url(),
            {
                "code": "BATCH-001",
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "10",
                "expired_date": "2026-12-31",
            },
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_cross_business_rejected(self, auth_client, other_location, variant):
        response = auth_client.post(
            _url(),
            {
                "code": "BATCH-001",
                "location": str(other_location.id),
                "variant": str(variant.id),
                "quantity": "10",
                "expired_date": "2026-12-31",
            },
            content_type="application/json",
        )
        assert response.status_code == 404


@pytest.mark.django_db
class TestExpiredDateDetail:
    def test_detail_shows_expired_date(self, auth_client, batch):
        batch.expired_date = date(2026, 12, 31)
        batch.save()
        response = auth_client.get(_url(f"{batch.id}/"))
        assert response.status_code == 200
        assert response.data["expired_date"] == "2026-12-31"

    def test_null_expired_date_valid(self, auth_client, batch):
        response = auth_client.get(_url(f"{batch.id}/"))
        assert response.status_code == 200
        assert response.data["expired_date"] is None

    def test_cross_business_detail_returns_404(self, auth_client, other_location, other_variant, other_user):
        other_batch = Batch.objects.create(
            code="OTHER-001",
            location=other_location,
            variant=other_variant,
            quantity=Decimal("3"),
            expired_date=date(2026, 1, 1),
        )
        response = auth_client.get(_url(f"{other_batch.id}/"))
        assert response.status_code == 404

    def test_nonexistent_detail_returns_404(self, auth_client):
        response = auth_client.get(_url(f"{uuid4()}/"))
        assert response.status_code == 404

    def test_unauthenticated_detail_returns_401(self, client, batch):
        response = client.get(_url(f"{batch.id}/"))
        assert response.status_code == 401


@pytest.mark.django_db
class TestExpiredDateUpdate:
    def test_owner_can_update_expired_date(self, auth_client, batch):
        response = auth_client.patch(
            _url(f"{batch.id}/"),
            {"expired_date": "2027-06-30"},
            content_type="application/json",
        )
        assert response.status_code == 200
        batch.refresh_from_db()
        assert batch.expired_date == date(2027, 6, 30)
        assert response.data["expired_date"] == "2027-06-30"

    def test_owner_can_clear_expired_date_to_null(self, auth_client, batch):
        batch.expired_date = date(2026, 12, 31)
        batch.save()
        response = auth_client.patch(
            _url(f"{batch.id}/"),
            {"expired_date": None},
            content_type="application/json",
        )
        assert response.status_code == 200
        batch.refresh_from_db()
        assert batch.expired_date is None

    def test_invalid_date_rejected(self, auth_client, batch):
        response = auth_client.patch(
            _url(f"{batch.id}/"),
            {"expired_date": "bad-date"},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_cross_business_update_returns_404(self, auth_client, other_location, other_variant, other_user):
        other_batch = Batch.objects.create(
            code="OTHER-001",
            location=other_location,
            variant=other_variant,
            quantity=Decimal("3"),
        )
        response = auth_client.patch(
            _url(f"{other_batch.id}/"),
            {"expired_date": "2027-06-30"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_unauthenticated_update_returns_401(self, client, batch):
        response = client.patch(
            _url(f"{batch.id}/"),
            {"expired_date": "2027-06-30"},
            content_type="application/json",
        )
        assert response.status_code == 401


@pytest.mark.django_db
class TestExpiredDateIntegrity:
    def test_expired_date_change_no_side_effects(self, auth_client, batch, location, variant, product):
        stock = Stock.objects.create(
            location=location, variant=variant, quantity=Decimal("10")
        )
        response = auth_client.patch(
            _url(f"{batch.id}/"),
            {"expired_date": "2028-01-15"},
            content_type="application/json",
        )
        assert response.status_code == 200
        batch.refresh_from_db()
        stock.refresh_from_db()
        assert batch.expired_date == date(2028, 1, 15)
        assert batch.quantity == Decimal("10")
        assert batch.code == "BATCH-001"
        assert str(batch.location_id) == str(location.id)
        assert str(batch.variant_id) == str(variant.id)
        assert stock.quantity == Decimal("10")
        assert Variant.objects.filter(pk=variant.id).exists()
        assert Product.objects.filter(pk=product.id).exists()
        assert Location.objects.filter(pk=location.id).exists()

    def test_other_user_cannot_access_own_business(self, other_auth_client, batch, other_user):
        response = other_auth_client.patch(
            _url(f"{batch.id}/"),
            {"expired_date": "2028-01-15"},
            content_type="application/json",
        )
        assert response.status_code == 404
