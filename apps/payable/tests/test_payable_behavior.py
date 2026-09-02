import uuid
from decimal import Decimal
import pytest

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.business.models import Business, Location, BusinessMembership
from apps.supplier.models import Supplier
from apps.product.models import Product, Variant
from apps.purchasing.models import PurchaseOrder, PurchaseOrderLine
from apps.payable.models import Payable, SupplierPaymentAllocation
from apps.audit.models import AuditLog

User = get_user_model()


@pytest.fixture
def owner_user(db):
    return User.objects.create_user(email="owner_payable@test.com", password="password123", is_email_verified=True)


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(email="admin_payable@test.com", password="password123", is_email_verified=True)


@pytest.fixture
def kasir_user(db):
    return User.objects.create_user(email="kasir_payable@test.com", password="password123", is_email_verified=True)


@pytest.fixture
def business(db, owner_user):
    return Business.objects.create(name="Test Business Payable", owner=owner_user, status=Business.Status.ACTIVE)


@pytest.fixture
def business2(db, owner_user):
    return Business.objects.create(name="Business 2 Payable", owner=owner_user, status=Business.Status.ACTIVE)


@pytest.fixture
def location(db, business):
    return Location.objects.create(name="Main Store", business=business)


@pytest.fixture
def location2(db, business):
    return Location.objects.create(name="Branch Store", business=business)


@pytest.fixture
def business2_location(db, business2):
    return Location.objects.create(name="Biz2 Store", business=business2)


@pytest.fixture
def supplier(db, business):
    return Supplier.objects.create(name="Supplier Alpha", business=business)


@pytest.fixture
def business2_supplier(db, business2):
    return Supplier.objects.create(name="Supplier Beta", business=business2)


@pytest.fixture
def variant(db, business):
    product = Product.objects.create(name="Raw Material", price=Decimal("100000.00"), business=business)
    return Variant.objects.create(product=product, name="Grade A Material", cost_price=Decimal("100000.00"))


@pytest.fixture
def purchase_order(db, business, location, supplier, variant):
    po = PurchaseOrder.objects.create(
        business=business,
        location=location,
        supplier=supplier,
        status=PurchaseOrder.Status.CONFIRMED,
    )
    PurchaseOrderLine.objects.create(
        purchase_order=po,
        variant=variant,
        quantity=Decimal("5.00"),
        unit_price=Decimal("100000.00"),
    )
    return po


@pytest.fixture
def draft_po(db, business, location, supplier, variant):
    po = PurchaseOrder.objects.create(
        business=business,
        location=location,
        supplier=supplier,
        status=PurchaseOrder.Status.DRAFT,
    )
    PurchaseOrderLine.objects.create(
        purchase_order=po,
        variant=variant,
        quantity=Decimal("2.00"),
        unit_price=Decimal("100000.00"),
    )
    return po


@pytest.fixture
def membership_admin(db, business, admin_user):
    return BusinessMembership.objects.create(business=business, user=admin_user, role="ADMIN")


@pytest.fixture
def membership_kasir(db, business, kasir_user):
    return BusinessMembership.objects.create(business=business, user=kasir_user, role="KASIR")


@pytest.fixture
def owner_client(owner_user):
    client = APIClient()
    client.force_authenticate(user=owner_user)
    return client


@pytest.fixture
def admin_client(admin_user, membership_admin):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def kasir_client(kasir_user, membership_kasir):
    client = APIClient()
    client.force_authenticate(user=kasir_user)
    return client


@pytest.mark.django_db
class TestPayableCreation:
    """Contract §6: Payable creation rules and PO eligibility"""

    def test_payable_creation_confirmed_po(self, owner_client, business, location, purchase_order):
        url = f"/api/v1/businesses/{business.id}/payables/"
        payload = {
            "purchase_order": str(purchase_order.id),
            "location": str(location.id),
            "due_date": "2026-12-31",
            "notes": "PO credit purchase",
        }
        res = owner_client.post(url, payload, format="json")
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "UNPAID"
        assert data["original_amount"] == "500000.00"
        assert data["paid_amount"] == "0.00"
        assert data["outstanding_amount"] == "500000.00"
        assert data["purchase_order"] == str(purchase_order.id)
        assert data["supplier"] == str(purchase_order.supplier.id)

    def test_payable_creation_with_dp(self, owner_client, business, location, purchase_order):
        url = f"/api/v1/businesses/{business.id}/payables/"
        payload = {
            "purchase_order": str(purchase_order.id),
            "location": str(location.id),
            "initial_payment": "200000.00",
            "payment_method": "CASH",
        }
        res = owner_client.post(url, payload, format="json")
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "PARTIAL"
        assert data["original_amount"] == "500000.00"
        assert data["paid_amount"] == "200000.00"
        assert data["outstanding_amount"] == "300000.00"
        assert len(data["allocations"]) == 1

    def test_payable_creation_draft_po_rejected(self, owner_client, business, location, draft_po):
        url = f"/api/v1/businesses/{business.id}/payables/"
        payload = {
            "purchase_order": str(draft_po.id),
            "location": str(location.id),
        }
        res = owner_client.post(url, payload, format="json")
        assert res.status_code == 400
        assert "CONFIRMED" in str(res.content)

    def test_overpayment_initial_payment_rejected(self, owner_client, business, location, purchase_order):
        url = f"/api/v1/businesses/{business.id}/payables/"
        payload = {
            "purchase_order": str(purchase_order.id),
            "location": str(location.id),
            "initial_payment": "600000.00",  # total is 500k
        }
        res = owner_client.post(url, payload, format="json")
        assert res.status_code == 400


@pytest.mark.django_db
class TestPayablePaymentRecording:
    """Contract §7: Payment recording and status transitions"""

    def test_payment_on_unpaid(self, owner_client, business, location, purchase_order):
        # 1. Create Payable
        pay_res = owner_client.post(
            f"/api/v1/businesses/{business.id}/payables/",
            {"purchase_order": str(purchase_order.id), "location": str(location.id)},
            format="json",
        )
        payable_id = pay_res.json()["id"]

        # 2. Record payment
        pay_url = f"/api/v1/businesses/{business.id}/payables/{payable_id}/pay/"
        res = owner_client.post(pay_url, {"amount": "200000.00", "payment_method": "TRANSFER"}, format="json")
        assert res.status_code == 201
        data = res.json()["payable"]
        assert data["status"] == "PARTIAL"
        assert data["paid_amount"] == "200000.00"
        assert data["outstanding_amount"] == "300000.00"

    def test_payment_terminal_status_guards(self, owner_client, business, location, purchase_order):
        # Create & fully pay
        pay_res = owner_client.post(
            f"/api/v1/businesses/{business.id}/payables/",
            {"purchase_order": str(purchase_order.id), "location": str(location.id), "initial_payment": "500000.00"},
            format="json",
        )
        payable_id = pay_res.json()["id"]
        assert pay_res.json()["status"] == "PAID"

        # Try to pay PAID payable
        pay_url = f"/api/v1/businesses/{business.id}/payables/{payable_id}/pay/"
        res = owner_client.post(pay_url, {"amount": "10000.00", "payment_method": "CASH"}, format="json")
        assert res.status_code == 400


@pytest.mark.django_db
class TestPayableReversal:
    """Contract §8: Supplier Payment Reversal"""

    def test_owner_reverses_payment(self, owner_client, business, location, purchase_order):
        # Create with DP
        pay_res = owner_client.post(
            f"/api/v1/businesses/{business.id}/payables/",
            {"purchase_order": str(purchase_order.id), "location": str(location.id), "initial_payment": "200000.00"},
            format="json",
        )
        payable_id = pay_res.json()["id"]
        alloc_id = pay_res.json()["allocations"][0]["id"]

        # Reverse payment
        rev_url = f"/api/v1/businesses/{business.id}/payables/{payable_id}/payments/{alloc_id}/reverse/"
        res = owner_client.post(rev_url, {"reversal_reason": "Wrong amount entered"}, format="json")
        assert res.status_code == 200
        data = res.json()
        assert data["payment"]["is_reversed"] is True
        assert data["payable"]["status"] == "UNPAID"
        assert data["payable"]["outstanding_amount"] == "500000.00"

    def test_admin_cannot_reverse_payment(self, admin_client, business, location, purchase_order, owner_client):
        pay_res = owner_client.post(
            f"/api/v1/businesses/{business.id}/payables/",
            {"purchase_order": str(purchase_order.id), "location": str(location.id), "initial_payment": "200000.00"},
            format="json",
        )
        payable_id = pay_res.json()["id"]
        alloc_id = pay_res.json()["allocations"][0]["id"]

        rev_url = f"/api/v1/businesses/{business.id}/payables/{payable_id}/payments/{alloc_id}/reverse/"
        res = admin_client.post(rev_url, {"reversal_reason": "Admin try"}, format="json")
        assert res.status_code == 403


@pytest.mark.django_db
class TestKasirAccessRestrictions:
    """Contract §13: KASIR must be fully denied access to Payables"""

    def test_kasir_denied_all_payable_endpoints(self, kasir_client, business, location, purchase_order):
        list_url = f"/api/v1/businesses/{business.id}/payables/"
        assert kasir_client.get(list_url).status_code == 403
        assert kasir_client.post(list_url, {"purchase_order": str(purchase_order.id), "location": str(location.id)}).status_code == 403
        assert kasir_client.get(f"{list_url}reports/").status_code == 403
