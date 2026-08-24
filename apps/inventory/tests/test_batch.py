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
class TestBatchCreate:
    def test_owner_can_create_batch(self, auth_client, location, variant):
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
        assert response.data["code"] == "BATCH-001"
        assert response.data["quantity"] == "10.00"
        assert str(location.id) == response.data["location"]
        assert str(variant.id) == response.data["variant"]

    def test_unauthenticated_returns_401(self, client, location, variant):
        response = client.post(
            _url(),
            {
                "code": "BATCH-001",
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_cross_business_location_rejected(self, auth_client, other_location, variant):
        response = auth_client.post(
            _url(),
            {
                "code": "BATCH-001",
                "location": str(other_location.id),
                "variant": str(variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_variant_location_mismatch_rejected(self, auth_client, location, other_variant):
        response = auth_client.post(
            _url(),
            {
                "code": "BATCH-001",
                "location": str(location.id),
                "variant": str(other_variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_missing_code_rejected(self, auth_client, location, variant):
        response = auth_client.post(
            _url(),
            {
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "10",
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_invalid_quantity_rejected(self, auth_client, location, variant):
        response = auth_client.post(
            _url(),
            {
                "code": "BATCH-001",
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "abc",
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_negative_quantity_rejected(self, auth_client, location, variant):
        response = auth_client.post(
            _url(),
            {
                "code": "BATCH-001",
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "-5",
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_duplicate_code_rejected(self, auth_client, location, variant, batch):
        response = auth_client.post(
            _url(),
            {
                "code": "BATCH-001",
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "5",
            },
            content_type="application/json",
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestBatchList:
    def test_owner_sees_own_batches(self, auth_client, location, variant, batch):
        response = auth_client.get(_url())
        assert response.status_code == 200
        ids = [item["id"] for item in response.data]
        assert str(batch.id) in ids

    def test_owner_does_not_see_other_business_batches(
        self, auth_client, other_location, other_variant, other_user
    ):
        Batch.objects.create(
            code="OTHER-001",
            location=other_location,
            variant=other_variant,
            quantity=Decimal("3"),
        )
        response = auth_client.get(_url())
        assert response.status_code == 200
        ids = [item["id"] for item in response.data]
        assert len(ids) == 0

    def test_unauthenticated_list_returns_401(self, client):
        response = client.get(_url())
        assert response.status_code == 401


@pytest.mark.django_db
class TestBatchDetail:
    def test_owner_can_retrieve_batch(self, auth_client, batch):
        response = auth_client.get(_url(f"{batch.id}/"))
        assert response.status_code == 200
        assert response.data["id"] == str(batch.id)

    def test_nonexistent_batch_returns_404(self, auth_client):
        response = auth_client.get(_url(f"{uuid4()}/"))
        assert response.status_code == 404

    def test_cross_business_batch_returns_404(self, auth_client, other_location, other_variant, other_user):
        other_batch = Batch.objects.create(
            code="OTHER-001",
            location=other_location,
            variant=other_variant,
            quantity=Decimal("3"),
        )
        response = auth_client.get(_url(f"{other_batch.id}/"))
        assert response.status_code == 404

    def test_unauthenticated_detail_returns_401(self, client, batch):
        response = client.get(_url(f"{batch.id}/"))
        assert response.status_code == 401


@pytest.mark.django_db
class TestBatchUpdate:
    def test_owner_can_update_allowed_fields(self, auth_client, batch):
        response = auth_client.patch(
            _url(f"{batch.id}/"),
            {"quantity": "25", "code": "BATCH-002"},
            content_type="application/json",
        )
        assert response.status_code == 200
        batch.refresh_from_db()
        assert batch.quantity == Decimal("25")
        assert batch.code == "BATCH-002"

    def test_quantity_negative_rejected(self, auth_client, batch):
        response = auth_client.patch(
            _url(f"{batch.id}/"),
            {"quantity": "-5"},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_code_duplicate_rejected(self, auth_client, location, variant, batch):
        Batch.objects.create(
            code="BATCH-OTHER",
            location=location,
            variant=variant,
            quantity=Decimal("1"),
        )
        response = auth_client.patch(
            _url(f"{batch.id}/"),
            {"code": "BATCH-OTHER"},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_ownership_cannot_be_changed(self, auth_client, batch, other_location, other_variant):
        original_location = str(batch.location_id)
        original_variant = str(batch.variant_id)
        response = auth_client.patch(
            _url(f"{batch.id}/"),
            {"location": str(other_location.id), "variant": str(other_variant.id)},
            content_type="application/json",
        )
        assert response.status_code == 200
        batch.refresh_from_db()
        assert str(batch.location_id) == original_location
        assert str(batch.variant_id) == original_variant

    def test_cross_business_update_returns_404(self, auth_client, other_location, other_variant, other_user):
        other_batch = Batch.objects.create(
            code="OTHER-001",
            location=other_location,
            variant=other_variant,
            quantity=Decimal("3"),
        )
        response = auth_client.patch(
            _url(f"{other_batch.id}/"),
            {"quantity": "1"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_nonexistent_update_returns_404(self, auth_client):
        response = auth_client.patch(
            _url(f"{uuid4()}/"),
            {"quantity": "1"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_unauthenticated_update_returns_401(self, client, batch):
        response = client.patch(
            _url(f"{batch.id}/"),
            {"quantity": "1"},
            content_type="application/json",
        )
        assert response.status_code == 401


@pytest.mark.django_db
class TestBatchDelete:
    def test_owner_can_delete(self, auth_client, batch):
        response = auth_client.delete(_url(f"{batch.id}/"))
        assert response.status_code == 204

    def test_deleted_batch_no_longer_exists(self, auth_client, batch):
        auth_client.delete(_url(f"{batch.id}/"))
        assert not Batch.objects.filter(pk=batch.id).exists()

    def test_nonexistent_delete_returns_404(self, auth_client):
        response = auth_client.delete(_url(f"{uuid4()}/"))
        assert response.status_code == 404

    def test_cross_business_delete_returns_404(self, auth_client, other_location, other_variant, other_user):
        other_batch = Batch.objects.create(
            code="OTHER-001",
            location=other_location,
            variant=other_variant,
            quantity=Decimal("3"),
        )
        response = auth_client.delete(_url(f"{other_batch.id}/"))
        assert response.status_code == 404

    def test_unrelated_batch_remains(self, auth_client, batch, other_location, other_variant, other_user):
        other_batch = Batch.objects.create(
            code="OTHER-001",
            location=other_location,
            variant=other_variant,
            quantity=Decimal("3"),
        )
        auth_client.delete(_url(f"{batch.id}/"))
        assert Batch.objects.filter(pk=other_batch.id).exists()

    def test_stock_variant_product_location_unaffected(
        self, auth_client, batch, location, variant, product
    ):
        stock = Stock.objects.create(
            location=location, variant=variant, quantity=Decimal("10")
        )
        auth_client.delete(_url(f"{batch.id}/"))
        assert Stock.objects.filter(pk=stock.id).exists()
        assert Variant.objects.filter(pk=variant.id).exists()
        assert Product.objects.filter(pk=product.id).exists()
        assert Location.objects.filter(pk=location.id).exists()
        stock.refresh_from_db()
        assert stock.quantity == Decimal("10")


@pytest.mark.django_db
class TestBatchSecurity:
    def test_other_user_cannot_access_own_business(
        self, other_auth_client, batch, location, variant, other_user
    ):
        response = other_auth_client.get(_url(f"{batch.id}/"))
        assert response.status_code == 404

    def test_batch_crud_does_not_change_stock_quantity(
        self, auth_client, location, variant
    ):
        stock = Stock.objects.create(
            location=location, variant=variant, quantity=Decimal("10")
        )
        auth_client.post(
            _url(),
            {
                "code": "BATCH-X",
                "location": str(location.id),
                "variant": str(variant.id),
                "quantity": "100",
            },
            content_type="application/json",
        )
        stock.refresh_from_db()
        assert stock.quantity == Decimal("10")
