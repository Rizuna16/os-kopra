from datetime import date

from decimal import Decimal
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, Location
from apps.inventory.models import Batch, SerialNumber, Stock
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


@pytest.fixture
def other_batch(db, other_location, other_variant):
    return Batch.objects.create(
        code="BATCH-OTHER", location=other_location, variant=other_variant, quantity=Decimal("5")
    )


def _url(suffix=""):
    return f"/api/v1/inventory/serial-numbers/{suffix}"


@pytest.mark.django_db
class TestSerialNumberCreate:
    def test_owner_can_create(self, auth_client, batch):
        response = auth_client.post(
            _url(),
            {"batch": str(batch.id), "serial_number": "SN-001"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["serial_number"] == "SN-001"
        assert response.data["batch"] == str(batch.id)

    def test_unauthenticated_returns_401(self, client, batch):
        response = client.post(
            _url(),
            {"batch": str(batch.id), "serial_number": "SN-001"},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_missing_batch_rejected(self, auth_client):
        response = auth_client.post(
            _url(),
            {"serial_number": "SN-001"},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_nonexistent_batch_rejected(self, auth_client):
        response = auth_client.post(
            _url(),
            {"batch": str(uuid4()), "serial_number": "SN-001"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_cross_business_batch_rejected(self, auth_client, other_batch):
        response = auth_client.post(
            _url(),
            {"batch": str(other_batch.id), "serial_number": "SN-001"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_missing_serial_number_rejected(self, auth_client, batch):
        response = auth_client.post(
            _url(),
            {"batch": str(batch.id)},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_empty_serial_number_rejected(self, auth_client, batch):
        response = auth_client.post(
            _url(),
            {"batch": str(batch.id), "serial_number": "   "},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_duplicate_serial_number_rejected(self, auth_client, batch):
        SerialNumber.objects.create(batch=batch, serial_number="SN-001")
        response = auth_client.post(
            _url(),
            {"batch": str(batch.id), "serial_number": "SN-001"},
            content_type="application/json",
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestSerialNumberList:
    def test_owner_sees_own_serials(self, auth_client, batch):
        sn = SerialNumber.objects.create(batch=batch, serial_number="SN-001")
        response = auth_client.get(_url())
        assert response.status_code == 200
        ids = [item["id"] for item in response.data]
        assert str(sn.id) in ids

    def test_owner_does_not_see_other_business(self, auth_client, other_batch, other_user):
        SerialNumber.objects.create(batch=other_batch, serial_number="SN-OTHER")
        response = auth_client.get(_url())
        assert response.status_code == 200
        assert len(response.data) == 0

    def test_unauthenticated_list_returns_401(self, client):
        response = client.get(_url())
        assert response.status_code == 401


@pytest.mark.django_db
class TestSerialNumberDetail:
    def test_owner_can_retrieve(self, auth_client, batch):
        sn = SerialNumber.objects.create(batch=batch, serial_number="SN-001")
        response = auth_client.get(_url(f"{sn.id}/"))
        assert response.status_code == 200
        assert response.data["id"] == str(sn.id)

    def test_nonexistent_returns_404(self, auth_client):
        response = auth_client.get(_url(f"{uuid4()}/"))
        assert response.status_code == 404

    def test_cross_business_returns_404(self, auth_client, other_batch, other_user):
        sn = SerialNumber.objects.create(batch=other_batch, serial_number="SN-OTHER")
        response = auth_client.get(_url(f"{sn.id}/"))
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, batch):
        sn = SerialNumber.objects.create(batch=batch, serial_number="SN-001")
        response = client.get(_url(f"{sn.id}/"))
        assert response.status_code == 401


@pytest.mark.django_db
class TestSerialNumberUpdate:
    def test_owner_can_update_serial_number(self, auth_client, batch):
        sn = SerialNumber.objects.create(batch=batch, serial_number="SN-001")
        response = auth_client.patch(
            _url(f"{sn.id}/"),
            {"serial_number": "SN-002"},
            content_type="application/json",
        )
        assert response.status_code == 200
        sn.refresh_from_db()
        assert sn.serial_number == "SN-002"

    def test_duplicate_serial_number_rejected(self, auth_client, batch):
        SerialNumber.objects.create(batch=batch, serial_number="SN-001")
        sn = SerialNumber.objects.create(batch=batch, serial_number="SN-002")
        response = auth_client.patch(
            _url(f"{sn.id}/"),
            {"serial_number": "SN-001"},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_empty_serial_number_rejected(self, auth_client, batch):
        sn = SerialNumber.objects.create(batch=batch, serial_number="SN-001")
        response = auth_client.patch(
            _url(f"{sn.id}/"),
            {"serial_number": "   "},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_batch_cannot_be_changed(self, auth_client, batch, other_batch):
        sn = SerialNumber.objects.create(batch=batch, serial_number="SN-001")
        original_batch = str(sn.batch_id)
        response = auth_client.patch(
            _url(f"{sn.id}/"),
            {"batch": str(other_batch.id)},
            content_type="application/json",
        )
        assert response.status_code == 200
        sn.refresh_from_db()
        assert str(sn.batch_id) == original_batch

    def test_cross_business_update_returns_404(self, auth_client, other_batch, other_user):
        sn = SerialNumber.objects.create(batch=other_batch, serial_number="SN-OTHER")
        response = auth_client.patch(
            _url(f"{sn.id}/"),
            {"serial_number": "SN-NEW"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_nonexistent_update_returns_404(self, auth_client):
        response = auth_client.patch(
            _url(f"{uuid4()}/"),
            {"serial_number": "SN-NEW"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_unauthenticated_update_returns_401(self, client, batch):
        sn = SerialNumber.objects.create(batch=batch, serial_number="SN-001")
        response = client.patch(
            _url(f"{sn.id}/"),
            {"serial_number": "SN-NEW"},
            content_type="application/json",
        )
        assert response.status_code == 401


@pytest.mark.django_db
class TestSerialNumberDelete:
    def test_owner_can_delete(self, auth_client, batch):
        sn = SerialNumber.objects.create(batch=batch, serial_number="SN-001")
        response = auth_client.delete(_url(f"{sn.id}/"))
        assert response.status_code == 204

    def test_deleted_no_longer_exists(self, auth_client, batch):
        sn = SerialNumber.objects.create(batch=batch, serial_number="SN-001")
        auth_client.delete(_url(f"{sn.id}/"))
        assert not SerialNumber.objects.filter(pk=sn.id).exists()

    def test_nonexistent_delete_returns_404(self, auth_client):
        response = auth_client.delete(_url(f"{uuid4()}/"))
        assert response.status_code == 404

    def test_cross_business_delete_returns_404(self, auth_client, other_batch, other_user):
        sn = SerialNumber.objects.create(batch=other_batch, serial_number="SN-OTHER")
        response = auth_client.delete(_url(f"{sn.id}/"))
        assert response.status_code == 404

    def test_unrelated_remains(self, auth_client, batch, other_batch, other_user):
        sn = SerialNumber.objects.create(batch=batch, serial_number="SN-001")
        other_sn = SerialNumber.objects.create(batch=other_batch, serial_number="SN-OTHER")
        auth_client.delete(_url(f"{sn.id}/"))
        assert SerialNumber.objects.filter(pk=other_sn.id).exists()


@pytest.mark.django_db
class TestSerialNumberIntegrity:
    def test_crud_does_not_change_related_objects(self, auth_client, batch, location, variant, product):
        sn = SerialNumber.objects.create(batch=batch, serial_number="SN-001")
        stock = Stock.objects.create(
            location=location, variant=variant, quantity=Decimal("10")
        )
        response = auth_client.patch(
            _url(f"{sn.id}/"),
            {"serial_number": "SN-UPDATED"},
            content_type="application/json",
        )
        assert response.status_code == 200
        sn.refresh_from_db()
        batch.refresh_from_db()
        stock.refresh_from_db()
        assert sn.serial_number == "SN-UPDATED"
        assert batch.quantity == Decimal("10")
        assert batch.code == "BATCH-001"
        assert batch.expired_date is None
        assert str(batch.location_id) == str(location.id)
        assert str(batch.variant_id) == str(variant.id)
        assert stock.quantity == Decimal("10")
        assert Variant.objects.filter(pk=variant.id).exists()
        assert Product.objects.filter(pk=product.id).exists()
        assert Location.objects.filter(pk=location.id).exists()

    def test_other_user_cannot_access_own_business(self, other_auth_client, batch, other_user):
        sn = SerialNumber.objects.create(batch=batch, serial_number="SN-001")
        response = other_auth_client.get(_url(f"{sn.id}/"))
        assert response.status_code == 404
