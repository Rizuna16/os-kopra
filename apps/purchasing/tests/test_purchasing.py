import pytest
from django.contrib.auth import get_user_model

from apps.business.models import Business, Location
from apps.inventory.models import Stock
from apps.product.models import Product, Variant
from apps.purchasing.models import PurchaseOrder, PurchaseOrderLine
from apps.supplier.models import Supplier

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
def supplier(db, business):
    return Supplier.objects.create(business=business, name="PT Sumber Makmur")


@pytest.fixture
def other_supplier(db, other_business):
    return Supplier.objects.create(business=other_business, name="PT Sumber Lain")


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


def _url(business_id, suffix=""):
    return f"/api/v1/businesses/{business_id}/purchase-orders/{suffix}"


@pytest.fixture
def po_payload():
    def _build(supplier_id, location_id, variant_id, status="DRAFT"):
        return {
            "supplier": str(supplier_id),
            "location": str(location_id),
            "status": status,
            "lines": [
                {
                    "variant": str(variant_id),
                    "quantity": "10",
                    "unit_price": "50000",
                }
            ],
        }

    return _build


@pytest.mark.django_db
class TestPurchaseOrderCreate:
    def test_owner_can_create_po(self, auth_client, business, supplier, location, variant, po_payload):
        response = auth_client.post(
            _url(business.id),
            po_payload(supplier.id, location.id, variant.id),
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["supplier"] == str(supplier.id)
        assert response.data["location"] == str(location.id)
        assert response.data["status"] == "DRAFT"
        assert response.data["business"] == str(business.id)
        assert PurchaseOrder.objects.filter(business=business).exists()

    def test_unauthenticated_rejected(self, client, business, supplier, location, variant, po_payload):
        response = client.post(
            _url(business.id),
            po_payload(supplier.id, location.id, variant.id),
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_supplier_required(self, auth_client, business, supplier, location, variant, po_payload):
        payload = po_payload(supplier.id, location.id, variant.id)
        del payload["supplier"]
        response = auth_client.post(
            _url(business.id), payload, content_type="application/json"
        )
        assert response.status_code == 400

    def test_location_required(self, auth_client, business, supplier, location, variant, po_payload):
        payload = po_payload(supplier.id, location.id, variant.id)
        del payload["location"]
        response = auth_client.post(
            _url(business.id), payload, content_type="application/json"
        )
        assert response.status_code == 400

    def test_valid_supplier_same_business_accepted(self, auth_client, business, supplier, location, variant, po_payload):
        response = auth_client.post(
            _url(business.id),
            po_payload(supplier.id, location.id, variant.id),
            content_type="application/json",
        )
        assert response.status_code == 201

    def test_supplier_from_other_business_rejected(self, auth_client, business, other_supplier, location, variant, po_payload):
        response = auth_client.post(
            _url(business.id),
            po_payload(other_supplier.id, location.id, variant.id),
            content_type="application/json",
        )
        assert response.status_code == 400
        assert PurchaseOrder.objects.filter(business=business).count() == 0

    def test_location_from_other_business_rejected(self, auth_client, business, supplier, other_location, variant, po_payload):
        response = auth_client.post(
            _url(business.id),
            po_payload(supplier.id, other_location.id, variant.id),
            content_type="application/json",
        )
        assert response.status_code == 400
        assert PurchaseOrder.objects.filter(business=business).count() == 0

    def test_variant_from_other_business_rejected(self, auth_client, business, supplier, location, other_variant, po_payload):
        response = auth_client.post(
            _url(business.id),
            po_payload(supplier.id, location.id, other_variant.id),
            content_type="application/json",
        )
        assert response.status_code == 400
        assert PurchaseOrder.objects.filter(business=business).count() == 0

    def test_business_ownership_cannot_be_overridden(self, auth_client, business, other_business, supplier, location, variant, po_payload):
        response = auth_client.post(
            _url(business.id),
            {**po_payload(supplier.id, location.id, variant.id), "business": str(other_business.id)},
            content_type="application/json",
        )
        assert response.status_code == 201
        po = PurchaseOrder.objects.get(business=business)
        assert str(po.business_id) == str(business.id)

    def test_invalid_status_rejected(self, auth_client, business, supplier, location, variant, po_payload):
        response = auth_client.post(
            _url(business.id),
            po_payload(supplier.id, location.id, variant.id, status="SHIPPED"),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_valid_draft_accepted(self, auth_client, business, supplier, location, variant, po_payload):
        response = auth_client.post(
            _url(business.id),
            po_payload(supplier.id, location.id, variant.id, status="DRAFT"),
            content_type="application/json",
        )
        assert response.status_code == 201
        assert PurchaseOrder.objects.get(business=business).status == "DRAFT"

    def test_valid_confirmed_accepted(self, auth_client, business, supplier, location, variant, po_payload):
        response = auth_client.post(
            _url(business.id),
            po_payload(supplier.id, location.id, variant.id, status="CONFIRMED"),
            content_type="application/json",
        )
        assert response.status_code == 201
        assert PurchaseOrder.objects.get(business=business).status == "CONFIRMED"

    def test_valid_cancelled_accepted(self, auth_client, business, supplier, location, variant, po_payload):
        response = auth_client.post(
            _url(business.id),
            po_payload(supplier.id, location.id, variant.id, status="CANCELLED"),
            content_type="application/json",
        )
        assert response.status_code == 201
        assert PurchaseOrder.objects.get(business=business).status == "CANCELLED"

    def test_line_is_created_with_po(self, auth_client, business, supplier, location, variant, po_payload):
        response = auth_client.post(
            _url(business.id),
            po_payload(supplier.id, location.id, variant.id),
            content_type="application/json",
        )
        assert response.status_code == 201
        po = PurchaseOrder.objects.get(business=business)
        assert PurchaseOrderLine.objects.filter(purchase_order=po).count() == 1
        line = po.lines.first()
        assert str(line.variant_id) == str(variant.id)
        assert str(line.quantity) == "10.00"
        assert str(line.unit_price) == "50000.00"

    def test_quantity_must_be_positive(self, auth_client, business, supplier, location, variant, po_payload):
        payload = po_payload(supplier.id, location.id, variant.id)
        payload["lines"][0]["quantity"] = "0"
        response = auth_client.post(
            _url(business.id), payload, content_type="application/json"
        )
        assert response.status_code == 400

    def test_unit_price_must_be_non_negative(self, auth_client, business, supplier, location, variant, po_payload):
        payload = po_payload(supplier.id, location.id, variant.id)
        payload["lines"][0]["unit_price"] = "-5000"
        response = auth_client.post(
            _url(business.id), payload, content_type="application/json"
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestPurchaseOrderList:
    def test_owner_can_list_own_po(self, auth_client, business, supplier, location, variant, po_payload):
        auth_client.post(
            _url(business.id),
            po_payload(supplier.id, location.id, variant.id),
            content_type="application/json",
        )
        response = auth_client.get(_url(business.id))
        assert response.status_code == 200
        assert len(response.data) == 1

    def test_other_business_po_not_exposed(self, auth_client, business, other_business, supplier, location, variant, po_payload, other_supplier, other_location, other_variant):
        auth_client.post(
            _url(business.id),
            po_payload(supplier.id, location.id, variant.id),
            content_type="application/json",
        )
        other_po = PurchaseOrder.objects.create(
            business=other_business, supplier=other_supplier, location=other_location, status="DRAFT"
        )
        PurchaseOrderLine.objects.create(
            purchase_order=other_po, variant=other_variant, quantity=1, unit_price=1
        )
        response = auth_client.get(_url(business.id))
        assert response.status_code == 200
        ids = {item["id"] for item in response.data}
        assert str(other_po.id) not in ids

    def test_unauthenticated_list_rejected(self, client, business):
        response = client.get(_url(business.id))
        assert response.status_code == 401


@pytest.mark.django_db
class TestPurchaseOrderDetail:
    def test_owner_can_retrieve(self, auth_client, business, supplier, location, variant):
        po = PurchaseOrder.objects.create(
            business=business, supplier=supplier, location=location, status="DRAFT"
        )
        response = auth_client.get(_url(business.id, f"{po.id}/"))
        assert response.status_code == 200
        assert response.data["id"] == str(po.id)

    def test_other_business_po_blocked(self, auth_client, other_business, other_supplier, other_location, other_variant):
        po = PurchaseOrder.objects.create(
            business=other_business, supplier=other_supplier, location=other_location, status="DRAFT"
        )
        response = auth_client.get(_url(other_business.id, f"{po.id}/"))
        assert response.status_code == 404

    def test_unauthenticated_detail_rejected(self, client, business, supplier, location):
        po = PurchaseOrder.objects.create(
            business=business, supplier=supplier, location=location, status="DRAFT"
        )
        response = client.get(_url(business.id, f"{po.id}/"))
        assert response.status_code == 401

    def test_cross_business_idor_blocked(self, auth_client, business, other_business, other_supplier, other_location, other_variant):
        po = PurchaseOrder.objects.create(
            business=other_business, supplier=other_supplier, location=other_location, status="DRAFT"
        )
        response = auth_client.get(_url(business.id, f"{po.id}/"))
        assert response.status_code == 404


@pytest.mark.django_db
class TestPurchaseOrderUpdate:
    def test_owner_can_update(self, auth_client, business, supplier, location, variant):
        po = PurchaseOrder.objects.create(
            business=business, supplier=supplier, location=location, status="DRAFT"
        )
        response = auth_client.patch(
            _url(business.id, f"{po.id}/"),
            {"status": "CONFIRMED"},
            content_type="application/json",
        )
        assert response.status_code == 200
        po.refresh_from_db()
        assert po.status == "CONFIRMED"

    def test_other_business_po_cannot_be_updated(self, auth_client, other_business, other_supplier, other_location):
        po = PurchaseOrder.objects.create(
            business=other_business, supplier=other_supplier, location=other_location, status="DRAFT"
        )
        response = auth_client.patch(
            _url(other_business.id, f"{po.id}/"),
            {"status": "CONFIRMED"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_unauthenticated_update_rejected(self, client, business, supplier, location):
        po = PurchaseOrder.objects.create(
            business=business, supplier=supplier, location=location, status="DRAFT"
        )
        response = client.patch(
            _url(business.id, f"{po.id}/"),
            {"status": "CONFIRMED"},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_supplier_cannot_move_to_other_business(self, auth_client, business, supplier, location, other_supplier):
        po = PurchaseOrder.objects.create(
            business=business, supplier=supplier, location=location, status="DRAFT"
        )
        response = auth_client.patch(
            _url(business.id, f"{po.id}/"),
            {"supplier": str(other_supplier.id)},
            content_type="application/json",
        )
        assert response.status_code == 400
        po.refresh_from_db()
        assert str(po.supplier_id) == str(supplier.id)

    def test_location_cannot_move_to_other_business(self, auth_client, business, supplier, location, other_location):
        po = PurchaseOrder.objects.create(
            business=business, supplier=supplier, location=location, status="DRAFT"
        )
        response = auth_client.patch(
            _url(business.id, f"{po.id}/"),
            {"location": str(other_location.id)},
            content_type="application/json",
        )
        assert response.status_code == 400
        po.refresh_from_db()
        assert str(po.location_id) == str(location.id)

    def test_variant_cannot_move_to_other_business(self, auth_client, business, supplier, location, variant, other_variant):
        po = PurchaseOrder.objects.create(
            business=business, supplier=supplier, location=location, status="DRAFT"
        )
        PurchaseOrderLine.objects.create(
            purchase_order=po, variant=variant, quantity=1, unit_price=1
        )
        response = auth_client.patch(
            _url(business.id, f"{po.id}/"),
            {"lines": [{"variant": str(other_variant.id), "quantity": "2", "unit_price": "2"}]},
            content_type="application/json",
        )
        assert response.status_code == 400
        line = po.lines.first()
        assert str(line.variant_id) == str(variant.id)

    def test_business_cannot_be_changed_by_client(self, auth_client, business, other_business, supplier, location):
        po = PurchaseOrder.objects.create(
            business=business, supplier=supplier, location=location, status="DRAFT"
        )
        response = auth_client.patch(
            _url(business.id, f"{po.id}/"),
            {"business": str(other_business.id)},
            content_type="application/json",
        )
        assert response.status_code == 200
        po.refresh_from_db()
        assert str(po.business_id) == str(business.id)

    def test_invalid_quantity_rejected(self, auth_client, business, supplier, location, variant):
        po = PurchaseOrder.objects.create(
            business=business, supplier=supplier, location=location, status="DRAFT"
        )
        PurchaseOrderLine.objects.create(
            purchase_order=po, variant=variant, quantity=1, unit_price=1
        )
        response = auth_client.patch(
            _url(business.id, f"{po.id}/"),
            {"lines": [{"variant": str(variant.id), "quantity": "0", "unit_price": "1"}]},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_invalid_unit_price_rejected(self, auth_client, business, supplier, location, variant):
        po = PurchaseOrder.objects.create(
            business=business, supplier=supplier, location=location, status="DRAFT"
        )
        PurchaseOrderLine.objects.create(
            purchase_order=po, variant=variant, quantity=1, unit_price=1
        )
        response = auth_client.patch(
            _url(business.id, f"{po.id}/"),
            {"lines": [{"variant": str(variant.id), "quantity": "1", "unit_price": "-1"}]},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_invalid_status_rejected(self, auth_client, business, supplier, location):
        po = PurchaseOrder.objects.create(
            business=business, supplier=supplier, location=location, status="DRAFT"
        )
        response = auth_client.patch(
            _url(business.id, f"{po.id}/"),
            {"status": "SHIPPED"},
            content_type="application/json",
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestPurchaseOrderDelete:
    def test_owner_can_delete(self, auth_client, business, supplier, location):
        po = PurchaseOrder.objects.create(
            business=business, supplier=supplier, location=location, status="DRAFT"
        )
        response = auth_client.delete(_url(business.id, f"{po.id}/"))
        assert response.status_code == 204
        assert not PurchaseOrder.objects.filter(pk=po.id).exists()

    def test_other_business_po_cannot_be_deleted(self, auth_client, other_business, other_supplier, other_location):
        po = PurchaseOrder.objects.create(
            business=other_business, supplier=other_supplier, location=other_location, status="DRAFT"
        )
        response = auth_client.delete(_url(other_business.id, f"{po.id}/"))
        assert response.status_code == 404
        assert PurchaseOrder.objects.filter(pk=po.id).exists()

    def test_unauthenticated_delete_rejected(self, client, business, supplier, location):
        po = PurchaseOrder.objects.create(
            business=business, supplier=supplier, location=location, status="DRAFT"
        )
        response = client.delete(_url(business.id, f"{po.id}/"))
        assert response.status_code == 401


@pytest.mark.django_db
class TestPurchaseOrderLineIsolation:
    def test_line_belongs_to_its_po(self, auth_client, business, supplier, location, variant):
        po = PurchaseOrder.objects.create(
            business=business, supplier=supplier, location=location, status="DRAFT"
        )
        line = PurchaseOrderLine.objects.create(
            purchase_order=po, variant=variant, quantity=3, unit_price=3
        )
        response = auth_client.get(_url(business.id, f"{po.id}/"))
        assert response.status_code == 200
        assert len(response.data["lines"]) == 1
        assert response.data["lines"][0]["id"] == str(line.id)

    def test_line_from_other_business_cannot_be_injected(self, auth_client, business, other_business, supplier, location, variant, other_variant):
        po = PurchaseOrder.objects.create(
            business=business, supplier=supplier, location=location, status="DRAFT"
        )
        response = auth_client.post(
            _url(business.id),
            {
                "supplier": str(supplier.id),
                "location": str(location.id),
                "status": "DRAFT",
                "lines": [
                    {"variant": str(other_variant.id), "quantity": "1", "unit_price": "1"}
                ],
            },
            content_type="application/json",
        )
        assert response.status_code == 400
        assert PurchaseOrderLine.objects.filter(purchase_order=po).count() == 0

    def test_line_cannot_escape_parent_po_scope(self, auth_client, business, supplier, location, variant):
        po = PurchaseOrder.objects.create(
            business=business, supplier=supplier, location=location, status="DRAFT"
        )
        other_po = PurchaseOrder.objects.create(
            business=business, supplier=supplier, location=location, status="DRAFT"
        )
        line = PurchaseOrderLine.objects.create(
            purchase_order=po, variant=variant, quantity=1, unit_price=1
        )
        response = auth_client.get(_url(business.id, f"{other_po.id}/"))
        assert response.status_code == 200
        assert len(response.data["lines"]) == 0
        assert str(line.purchase_order_id) == str(po.id)

    def test_unrelated_inventory_unchanged(self, auth_client, business, supplier, location, variant, po_payload):
        Stock.objects.create(location=location, variant=variant, quantity=5)
        response = auth_client.post(
            _url(business.id),
            po_payload(supplier.id, location.id, variant.id),
            content_type="application/json",
        )
        assert response.status_code == 201
        stock = Stock.objects.get(location=location, variant=variant)
        assert str(stock.quantity) == "5.00"


@pytest.mark.django_db
class TestPurchaseOrderSecurity:
    def test_server_side_business_ownership_enforced(self, auth_client, business, supplier, location, other_supplier, other_location):
        response = auth_client.post(
            _url(business.id),
            {
                "supplier": str(other_supplier.id),
                "location": str(other_location.id),
                "status": "DRAFT",
                "lines": [],
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_mass_assignment_blocked(self, auth_client, business, other_business, supplier, location, variant):
        response = auth_client.post(
            _url(business.id),
            {
                "business": str(other_business.id),
                "supplier": str(supplier.id),
                "location": str(location.id),
                "status": "DRAFT",
                "lines": [
                    {"variant": str(variant.id), "quantity": "1", "unit_price": "1"}
                ],
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        po = PurchaseOrder.objects.get(business=business)
        assert str(po.business_id) == str(business.id)

    def test_cross_business_supplier_blocked(self, auth_client, business, other_supplier, location, variant):
        response = auth_client.post(
            _url(business.id),
            {
                "supplier": str(other_supplier.id),
                "location": str(location.id),
                "status": "DRAFT",
                "lines": [
                    {"variant": str(variant.id), "quantity": "1", "unit_price": "1"}
                ],
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_cross_business_location_blocked(self, auth_client, business, supplier, other_location, variant):
        response = auth_client.post(
            _url(business.id),
            {
                "supplier": str(supplier.id),
                "location": str(other_location.id),
                "status": "DRAFT",
                "lines": [
                    {"variant": str(variant.id), "quantity": "1", "unit_price": "1"}
                ],
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_cross_business_variant_blocked(self, auth_client, business, supplier, location, other_variant):
        response = auth_client.post(
            _url(business.id),
            {
                "supplier": str(supplier.id),
                "location": str(location.id),
                "status": "DRAFT",
                "lines": [
                    {"variant": str(other_variant.id), "quantity": "1", "unit_price": "1"}
                ],
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_cross_business_po_blocked(self, auth_client, business, other_business, other_supplier, other_location):
        po = PurchaseOrder.objects.create(
            business=other_business, supplier=other_supplier, location=other_location, status="DRAFT"
        )
        response = auth_client.get(_url(business.id, f"{po.id}/"))
        assert response.status_code == 404

    def test_response_does_not_expose_unrelated_business(self, auth_client, business, supplier, location, variant, other_business):
        response = auth_client.post(
            _url(business.id),
            {
                "supplier": str(supplier.id),
                "location": str(location.id),
                "status": "DRAFT",
                "lines": [
                    {"variant": str(variant.id), "quantity": "1", "unit_price": "1"}
                ],
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        assert "other_business" not in str(response.data)
        assert str(other_business.id) not in str(response.data)
