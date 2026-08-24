import decimal

import pytest
from django.contrib.auth import get_user_model

from apps.business.models import Business, Location
from apps.inventory.models import Stock
from apps.product.models import Product, Variant
from apps.sales.models import Sale, SaleLine


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
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token)}


@pytest.fixture
def other_tokens(other_user):
    from rest_framework_simplejwt.tokens import RefreshToken
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
    return Location.objects.create(business=business, name="Cabang Dago")


@pytest.fixture
def other_location(db, other_business):
    return Location.objects.create(business=other_business, name="Cabang Lain")


@pytest.fixture
def product(db, business):
    return Product.objects.create(business=business, name="Sepatu Nike", price="100000")


@pytest.fixture
def variant(db, business, product):
    return Variant.objects.create(product=product, name="Hitam - 40")


@pytest.fixture
def other_product(db, other_business):
    return Product.objects.create(business=other_business, name="Sepatu Lain", price="50000")


@pytest.fixture
def other_variant(db, other_business, other_product):
    return Variant.objects.create(product=other_product, name="Putih - 41")


@pytest.fixture
def stock(business, location, variant):
    return Stock.objects.create(location=location, variant=variant, quantity=20)


@pytest.fixture
def line_payload(variant):
    def _build(variant_id=None, quantity="2", unit_price="50000"):
        return {
            "variant": str(variant_id if variant_id else variant.id),
            "quantity": quantity,
            "unit_price": unit_price,
        }
    return _build


def _url(business_id, suffix=""):
    return f"/api/v1/businesses/{business_id}/sales/{suffix}"


@pytest.fixture
def sale_payload(location):
    def _build(location_id=None, status=None, lines=None):
        payload = {
            "location": str(location_id if location_id else location.id),
        }
        if status:
            payload["status"] = status
        if lines is not None:
            payload["lines"] = lines
        return payload
    return _build


@pytest.mark.django_db
class TestSaleCreate:
    def test_owner_can_create_sale_default_draft(
        self, auth_client, business, location, variant, line_payload, sale_payload
    ):
        response = auth_client.post(
            _url(business.id),
            sale_payload(location_id=location.id, lines=[line_payload()]),
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["location"] == str(location.id)
        assert response.data["business"] == str(business.id)
        assert response.data["status"] == "DRAFT"
        assert Sale.objects.filter(business=business).exists()

    def test_unauthenticated_rejected(self, client, business, location, line_payload, sale_payload):
        response = client.post(
            _url(business.id),
            sale_payload(location_id=location.id, lines=[line_payload()]),
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_location_required(self, auth_client, business, line_payload):
        response = auth_client.post(
            _url(business.id),
            {"lines": [line_payload()]},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_valid_location_same_business_accepted(
        self, auth_client, business, location, variant, line_payload, sale_payload
    ):
        response = auth_client.post(
            _url(business.id),
            sale_payload(location_id=location.id, lines=[line_payload()]),
            content_type="application/json",
        )
        assert response.status_code == 201

    def test_location_from_other_business_rejected(
        self, auth_client, business, other_location, variant, line_payload, sale_payload
    ):
        response = auth_client.post(
            _url(business.id),
            sale_payload(location_id=other_location.id, lines=[line_payload()]),
            content_type="application/json",
        )
        assert response.status_code == 400
        assert Sale.objects.filter(business=business).count() == 0

    def test_variant_from_other_business_rejected(
        self, auth_client, business, location, other_variant, line_payload, sale_payload
    ):
        response = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id,
                lines=[line_payload(variant_id=other_variant.id)],
            ),
            content_type="application/json",
        )
        assert response.status_code == 400
        assert Sale.objects.filter(business=business).count() == 0

    def test_business_ownership_cannot_be_overridden(
        self, auth_client, business, other_business, location, variant, line_payload, sale_payload
    ):
        response = auth_client.post(
            _url(business.id),
            {**sale_payload(location_id=location.id, lines=[line_payload()]), "business": str(other_business.id)},
            content_type="application/json",
        )
        assert response.status_code == 201
        sale = Sale.objects.get(business=business)
        assert str(sale.business_id) == str(business.id)

    def test_invalid_status_rejected(
        self, auth_client, business, location, variant, line_payload, sale_payload
    ):
        response = auth_client.post(
            _url(business.id),
            sale_payload(location_id=location.id, status="PENDING", lines=[line_payload()]),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_valid_draft_accepted(
        self, auth_client, business, location, variant, line_payload, sale_payload
    ):
        response = auth_client.post(
            _url(business.id),
            sale_payload(location_id=location.id, status="DRAFT", lines=[line_payload()]),
            content_type="application/json",
        )
        assert response.status_code == 201
        assert Sale.objects.get(business=business).status == "DRAFT"

    def test_valid_completed_accepted(
        self, auth_client, business, location, variant, line_payload, sale_payload, stock
    ):
        response = auth_client.post(
            _url(business.id),
            sale_payload(location_id=location.id, status="COMPLETED", lines=[line_payload()]),
            content_type="application/json",
        )
        assert response.status_code == 201
        assert Sale.objects.get(business=business).status == "COMPLETED"

    def test_valid_voided_accepted(
        self, auth_client, business, location, variant, line_payload, sale_payload
    ):
        response = auth_client.post(
            _url(business.id),
            sale_payload(location_id=location.id, status="VOIDED", lines=[line_payload()]),
            content_type="application/json",
        )
        assert response.status_code == 201
        assert Sale.objects.get(business=business).status == "VOIDED"

    def test_line_is_created_with_sale(
        self, auth_client, business, location, variant, line_payload, sale_payload
    ):
        response = auth_client.post(
            _url(business.id),
            sale_payload(location_id=location.id, lines=[line_payload()]),
            content_type="application/json",
        )
        assert response.status_code == 201
        sale = Sale.objects.get(business=business)
        assert SaleLine.objects.filter(sale=sale).count() == 1
        line = sale.lines.first()
        assert str(line.variant_id) == str(variant.id)
        assert str(line.quantity) == "2.00"
        assert str(line.unit_price) == "50000.00"

    def test_quantity_must_be_positive(
        self, auth_client, business, location, variant, line_payload, sale_payload
    ):
        response = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id,
                lines=[line_payload(quantity="0")],
            ),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_unit_price_must_be_non_negative(
        self, auth_client, business, location, variant, line_payload, sale_payload
    ):
        response = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id,
                lines=[line_payload(unit_price="-5000")],
            ),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_completed_reduces_stock_atomically(
        self, auth_client, business, location, variant, line_payload, sale_payload, stock
    ):
        assert decimal.Decimal(stock.quantity) == decimal.Decimal("20")
        response = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id,
                status="COMPLETED",
                lines=[line_payload(quantity="5", unit_price="9000")],
            ),
            content_type="application/json",
        )
        assert response.status_code == 201
        stock.refresh_from_db()
        assert decimal.Decimal(stock.quantity) == decimal.Decimal("15")


@pytest.mark.django_db
class TestSaleList:
    def test_owner_can_list_own_sales(
        self, auth_client, business, location, variant, line_payload, sale_payload
    ):
        auth_client.post(
            _url(business.id),
            sale_payload(location_id=location.id, lines=[line_payload()]),
            content_type="application/json",
        )
        response = auth_client.get(_url(business.id))
        assert response.status_code == 200
        assert len(response.data) == 1

    def test_other_business_sales_not_exposed(
        self, auth_client, business, other_business
    ):
        other_loc = Location.objects.create(business=other_business, name="Cabang Lain")
        Sale.objects.create(business=other_business, location=other_loc, status="DRAFT")
        response = auth_client.get(_url(business.id))
        assert response.status_code == 200
        assert len(response.data) == 0

    def test_unauthenticated_list_rejected(self, client, business):
        response = client.get(_url(business.id))
        assert response.status_code == 401


@pytest.mark.django_db
class TestSaleDetail:
    def test_owner_can_retrieve(self, auth_client, business, location):
        sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        response = auth_client.get(_url(business.id, f"{sale.id}/"))
        assert response.status_code == 200
        assert response.data["id"] == str(sale.id)

    def test_other_business_sale_blocked(self, auth_client, other_business, other_location):
        sale = Sale.objects.create(business=other_business, location=other_location, status="DRAFT")
        response = auth_client.get(_url(other_business.id, f"{sale.id}/"))
        assert response.status_code == 404

    def test_unauthenticated_detail_rejected(self, client, business, location):
        sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        response = client.get(_url(business.id, f"{sale.id}/"))
        assert response.status_code == 401

    def test_cross_business_idor_blocked(self, auth_client, business, other_business, other_location):
        sale = Sale.objects.create(business=other_business, location=other_location, status="DRAFT")
        response = auth_client.get(_url(business.id, f"{sale.id}/"))
        assert response.status_code == 404


@pytest.mark.django_db
class TestSaleUpdate:
    def test_owner_can_update_status(self, auth_client, business, location):
        sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        response = auth_client.patch(
            _url(business.id, f"{sale.id}/"),
            {"status": "COMPLETED"},
            content_type="application/json",
        )
        assert response.status_code == 200
        sale.refresh_from_db()
        assert sale.status == "COMPLETED"

    def test_completed_from_draft_reduces_stock(
        self, auth_client, business, location, variant, stock
    ):
        sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        SaleLine.objects.create(sale=sale, variant=variant, quantity=3, unit_price=1)
        response = auth_client.patch(
            _url(business.id, f"{sale.id}/"),
            {"status": "COMPLETED"},
            content_type="application/json",
        )
        assert response.status_code == 200
        stock.refresh_from_db()
        assert decimal.Decimal(stock.quantity) == decimal.Decimal("17")

    def test_other_business_sale_cannot_be_updated(
        self, auth_client, other_business, other_location
    ):
        sale = Sale.objects.create(business=other_business, location=other_location, status="DRAFT")
        response = auth_client.patch(
            _url(other_business.id, f"{sale.id}/"),
            {"status": "COMPLETED"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_unauthenticated_update_rejected(self, client, business, location):
        sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        response = client.patch(
            _url(business.id, f"{sale.id}/"),
            {"status": "COMPLETED"},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_location_cannot_move_to_other_business(
        self, auth_client, business, location, other_location
    ):
        sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        response = auth_client.patch(
            _url(business.id, f"{sale.id}/"),
            {"location": str(other_location.id)},
            content_type="application/json",
        )
        assert response.status_code == 400
        sale.refresh_from_db()
        assert str(sale.location_id) == str(location.id)

    def test_variant_cannot_move_to_other_business(
        self, auth_client, business, location, variant, other_variant, line_payload
    ):
        sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        SaleLine.objects.create(sale=sale, variant=variant, quantity=1, unit_price=1)
        response = auth_client.patch(
            _url(business.id, f"{sale.id}/"),
            {"lines": [line_payload(variant_id=other_variant.id)]},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert str(sale.lines.first().variant_id) == str(variant.id)

    def test_business_cannot_be_changed_by_client(
        self, auth_client, business, other_business, location
    ):
        sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        response = auth_client.patch(
            _url(business.id, f"{sale.id}/"),
            {"business": str(other_business.id)},
            content_type="application/json",
        )
        assert response.status_code == 200
        sale.refresh_from_db()
        assert str(sale.business_id) == str(business.id)

    def test_invalid_quantity_rejected(
        self, auth_client, business, location, variant, line_payload
    ):
        sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        SaleLine.objects.create(sale=sale, variant=variant, quantity=1, unit_price=1)
        response = auth_client.patch(
            _url(business.id, f"{sale.id}/"),
            {"lines": [line_payload(quantity="0")]},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_invalid_unit_price_rejected(
        self, auth_client, business, location, variant, line_payload
    ):
        sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        SaleLine.objects.create(sale=sale, variant=variant, quantity=1, unit_price=1)
        response = auth_client.patch(
            _url(business.id, f"{sale.id}/"),
            {"lines": [line_payload(unit_price="-1")]},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_invalid_status_rejected(self, auth_client, business, location):
        sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        response = auth_client.patch(
            _url(business.id, f"{sale.id}/"),
            {"status": "SHIPPED"},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_completed_to_voided_blocked(
        self, auth_client, business, location, variant, stock
    ):
        sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        SaleLine.objects.create(sale=sale, variant=variant, quantity=5, unit_price=1)
        auth_client.patch(
            _url(business.id, f"{sale.id}/"),
            {"status": "COMPLETED"},
            content_type="application/json",
        )
        stock.refresh_from_db()
        assert decimal.Decimal(stock.quantity) == decimal.Decimal("15")
        response = auth_client.patch(
            _url(business.id, f"{sale.id}/"),
            {"status": "VOIDED"},
            content_type="application/json",
        )
        assert response.status_code == 400
        stock.refresh_from_db()
        assert decimal.Decimal(stock.quantity) == decimal.Decimal("15")


@pytest.mark.django_db
class TestSaleDelete:
    def test_owner_can_delete(self, auth_client, business, location):
        sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        response = auth_client.delete(_url(business.id, f"{sale.id}/"))
        assert response.status_code == 204
        assert not Sale.objects.filter(pk=sale.id).exists()

    def test_other_business_sale_cannot_be_deleted(
        self, auth_client, other_business, other_location
    ):
        sale = Sale.objects.create(business=other_business, location=other_location, status="DRAFT")
        response = auth_client.delete(_url(other_business.id, f"{sale.id}/"))
        assert response.status_code == 404
        assert Sale.objects.filter(pk=sale.id).exists()

    def test_unauthenticated_delete_rejected(self, client, business, location):
        sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        response = client.delete(_url(business.id, f"{sale.id}/"))
        assert response.status_code == 401


@pytest.mark.django_db
class TestSaleLineIsolation:
    def test_line_belongs_to_its_sale(self, auth_client, business, location, variant):
        sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        line = SaleLine.objects.create(sale=sale, variant=variant, quantity=3, unit_price=3)
        response = auth_client.get(_url(business.id, f"{sale.id}/"))
        assert response.status_code == 200
        assert len(response.data["lines"]) == 1
        assert response.data["lines"][0]["id"] == str(line.id)

    def test_line_from_other_business_cannot_be_injected(
        self, auth_client, business, location, other_variant, line_payload
    ):
        sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        response = auth_client.patch(
            _url(business.id, f"{sale.id}/"),
            {"lines": [line_payload(variant_id=other_variant.id)]},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert SaleLine.objects.filter(sale=sale).count() == 0

    def test_line_cannot_escape_parent_sale_scope(
        self, auth_client, business, location, variant, line_payload
    ):
        sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        other_sale = Sale.objects.create(business=business, location=location, status="DRAFT")
        line = SaleLine.objects.create(sale=sale, variant=variant, quantity=1, unit_price=1)
        response = auth_client.get(_url(business.id, f"{other_sale.id}/"))
        assert response.status_code == 200
        assert len(response.data["lines"]) == 0
        assert str(line.sale_id) == str(sale.id)

    def test_unrelated_inventory_unchanged_for_draft(
        self, auth_client, business, location, variant, line_payload, sale_payload, stock
    ):
        response = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id,
                status="DRAFT",
                lines=[line_payload(quantity="10", unit_price="50000")],
            ),
            content_type="application/json",
        )
        assert response.status_code == 201
        stock.refresh_from_db()
        assert str(stock.quantity) == "20.00"


@pytest.mark.django_db
class TestSaleSecurity:
    def test_server_side_business_ownership_enforced(
        self, auth_client, business, other_location, other_variant, line_payload
    ):
        response = auth_client.post(
            _url(business.id),
            {
                "location": str(other_location.id),
                "status": "DRAFT",
                "lines": [line_payload(variant_id=other_variant.id)],
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_mass_assignment_blocked(
        self, auth_client, business, other_business, location, variant, line_payload, sale_payload
    ):
        response = auth_client.post(
            _url(business.id),
            {
                **sale_payload(location_id=location.id, lines=[line_payload()]),
                "business": str(other_business.id),
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        sale = Sale.objects.get(business=business)
        assert str(sale.business_id) == str(business.id)

    def test_cross_business_location_blocked(
        self, auth_client, business, other_location, variant, line_payload
    ):
        response = auth_client.post(
            _url(business.id),
            {
                "location": str(other_location.id),
                "lines": [line_payload()],
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_cross_business_variant_blocked(
        self, auth_client, business, location, other_variant
    ):
        response = auth_client.post(
            _url(business.id),
            {
                "location": str(location.id),
                "lines": [{"variant": str(other_variant.id), "quantity": "1", "unit_price": "1"}],
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_cross_business_sale_blocked(self, auth_client, business, other_business, other_location):
        sale = Sale.objects.create(business=other_business, location=other_location, status="DRAFT")
        response = auth_client.get(_url(business.id, f"{sale.id}/"))
        assert response.status_code == 404

    def test_response_does_not_expose_unrelated_business(
        self, auth_client, business, location, variant, line_payload, sale_payload, other_business
    ):
        response = auth_client.post(
            _url(business.id),
            sale_payload(location_id=location.id, lines=[line_payload()]),
            content_type="application/json",
        )
        assert response.status_code == 201
        assert str(other_business.id) not in str(response.data)