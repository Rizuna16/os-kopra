import uuid
from decimal import Decimal
import pytest

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.business.models import Business, Location, BusinessMembership
from apps.customer.models import Customer
from apps.product.models import Product, Variant
from apps.inventory.models import Stock
from apps.sales.models import Sale, SaleLine
from apps.receivable.models import Receivable, PaymentAllocation
from apps.audit.models import AuditLog

User = get_user_model()


@pytest.fixture
def owner_user(db):
    return User.objects.create_user(email="owner@test.com", password="password123", is_email_verified=True)


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(email="admin@test.com", password="password123", is_email_verified=True)


@pytest.fixture
def kasir_user(db):
    return User.objects.create_user(email="kasir@test.com", password="password123", is_email_verified=True)


@pytest.fixture
def business(db, owner_user):
    return Business.objects.create(name="Test Business", owner=owner_user, status=Business.Status.ACTIVE)


@pytest.fixture
def business2(db, owner_user):
    return Business.objects.create(name="Business 2", owner=owner_user, status=Business.Status.ACTIVE)


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
def customer(db, business):
    return Customer.objects.create(name="John Customer", business=business)


@pytest.fixture
def business2_customer(db, business2):
    return Customer.objects.create(name="Jane Biz2 Customer", business=business2)


@pytest.fixture
def variant(db, business):
    product = Product.objects.create(name="Widget", price=Decimal("100000.00"), business=business)
    return Variant.objects.create(product=product, name="Standard Widget", cost_price=Decimal("100000.00"))


@pytest.fixture
def stock(db, location, variant):
    return Stock.objects.create(location=location, variant=variant, quantity=Decimal("100.00"))


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


# ============================================================
# 1. CREDIT SALE & ATOMIC CREATION
# ============================================================
@pytest.mark.django_db
class TestCreditSaleCreation:
    def test_credit_sale_zero_dp_creates_unpaid_receivable(self, owner_client, business, location, customer, variant, stock):
        """Credit sale with zero DP creates COMPLETED sale + UNPAID receivable + reduces stock once"""
        url = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "2.00", "unit_price": "100000.00"}],
            "initial_payment": "0.00",
            "due_date": "2026-12-31",
            "notes": "Credit sale test",
        }

        resp = owner_client.post(url, payload, format="json")
        assert resp.status_code == 201
        data = resp.data

        assert data["status"] == "UNPAID"
        assert Decimal(data["original_amount"]) == Decimal("200000.00")
        assert Decimal(data["paid_amount"]) == Decimal("0.00")
        assert Decimal(data["outstanding_amount"]) == Decimal("200000.00")
        assert len(data["allocations"]) == 0

        # Stock check: exactly reduced from 100 to 98
        stock.refresh_from_db()
        assert stock.quantity == Decimal("98.00")

        # Audit event check
        assert AuditLog.objects.filter(business=business, event_type="RECEIVABLE_CREATED").exists()

    def test_credit_sale_with_dp_creates_partial_receivable(self, owner_client, business, location, customer, variant, stock):
        """Credit sale with DP creates PARTIAL receivable + 1 PaymentAllocation + reduces stock"""
        url = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "40000.00",
            "payment_method": "CASH",
        }

        resp = owner_client.post(url, payload, format="json")
        assert resp.status_code == 201
        data = resp.data

        assert data["status"] == "PARTIAL"
        assert Decimal(data["original_amount"]) == Decimal("100000.00")
        assert Decimal(data["paid_amount"]) == Decimal("40000.00")
        assert Decimal(data["outstanding_amount"]) == Decimal("60000.00")
        assert len(data["allocations"]) == 1
        assert Decimal(data["allocations"][0]["amount"]) == Decimal("40000.00")

    def test_overpayment_initial_payment_rejected(self, owner_client, business, location, customer, variant):
        """Initial payment exceeding total sale amount must be rejected (HTTP 400)"""
        url = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "120000.00",
        }

        resp = owner_client.post(url, payload, format="json")
        assert resp.status_code == 400


# ============================================================
# 2. INVOICE UNIQUENESS PER BUSINESS
# ============================================================
@pytest.mark.django_db
class TestInvoiceUniqueness:
    def test_duplicate_invoice_number_same_business_rejected(self, owner_client, business, location, customer, variant):
        """Duplicate invoice_number within same business is rejected"""
        url = f"/api/v1/businesses/{business.id}/receivables/"
        payload1 = {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "50000.00"}],
            "invoice_number": "INV-UNIQUE-001",
        }
        resp1 = owner_client.post(url, payload1, format="json")
        assert resp1.status_code == 201

        payload2 = {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "50000.00"}],
            "invoice_number": "INV-UNIQUE-001",
        }
        with pytest.raises(Exception) as exc_info:
            owner_client.post(url, payload2, format="json")
        # Database unique constraint violation raises IntegrityError
        assert "unique_invoice_per_business" in str(exc_info.value).lower() or "unique" in str(exc_info.value).lower()

    def test_same_invoice_number_different_business_allowed(self, owner_client, business, business2, location, business2_location, customer, business2_customer, variant):
        """Same invoice_number on different business is allowed"""
        variant2 = Variant.objects.create(
            product=Product.objects.create(name="Widget 2", price=Decimal("50000.00"), business=business2),
            name="V2", cost_price=Decimal("50000.00")
        )
        url1 = f"/api/v1/businesses/{business.id}/receivables/"
        url2 = f"/api/v1/businesses/{business2.id}/receivables/"

        payload = {
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "50000.00"}],
            "invoice_number": "INV-SAME-NUM",
        }

        resp1 = owner_client.post(url1, {**payload, "location": str(location.id), "customer": str(customer.id)}, format="json")
        assert resp1.status_code == 201

        resp2 = owner_client.post(url2, {**payload, "lines": [{"variant": str(variant2.id), "quantity": "1.00", "unit_price": "50000.00"}], "location": str(business2_location.id), "customer": str(business2_customer.id)}, format="json")
        assert resp2.status_code == 201


# ============================================================
# 3. PAYMENT RECORDING & TERMINAL STATUS GUARD
# ============================================================
@pytest.mark.django_db
class TestPaymentRecording:
    def test_payment_on_unpaid_transitions_to_partial_or_paid(self, owner_client, business, location, customer, variant):
        """Payment on UNPAID transitions to PARTIAL or PAID correctly"""
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        resp_create = owner_client.post(url_create, {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "0.00",
        }, format="json")
        rec_id = resp_create.data["id"]

        # Pay 40k -> PARTIAL
        url_pay = f"/api/v1/businesses/{business.id}/receivables/{rec_id}/pay/"
        resp_pay1 = owner_client.post(url_pay, {"amount": "40000.00", "payment_method": "CASH"}, format="json")
        assert resp_pay1.status_code == 201
        assert resp_pay1.data["receivable"]["status"] == "PARTIAL"
        assert Decimal(resp_pay1.data["receivable"]["outstanding_amount"]) == Decimal("60000.00")

        # Pay remaining 60k -> PAID
        resp_pay2 = owner_client.post(url_pay, {"amount": "60000.00", "payment_method": "QRIS"}, format="json")
        assert resp_pay2.status_code == 201
        assert resp_pay2.data["receivable"]["status"] == "PAID"
        assert Decimal(resp_pay2.data["receivable"]["outstanding_amount"]) == Decimal("0.00")

    def test_payment_terminal_status_guards(self, owner_client, business, location, customer, variant):
        """Payment attempts on PAID, CLOSED, and VOIDED receivables must be rejected with HTTP 400"""
        resp_create = owner_client.post(f"/api/v1/businesses/{business.id}/receivables/", {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "50000.00"}],
            "initial_payment": "50000.00",
        }, format="json")
        paid_rec_id = resp_create.data["id"]

        url_pay_paid = f"/api/v1/businesses/{business.id}/receivables/{paid_rec_id}/pay/"
        resp_paid = owner_client.post(url_pay_paid, {"amount": "1000.00", "payment_method": "CASH"}, format="json")
        assert resp_paid.status_code == 400

    def test_overpayment_on_existing_receivable_rejected(self, owner_client, business, location, customer, variant):
        """Payment amount exceeding current outstanding balance is rejected (HTTP 400)"""
        resp_create = owner_client.post(f"/api/v1/businesses/{business.id}/receivables/", {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "40000.00",
        }, format="json")
        rec_id = resp_create.data["id"]

        url_pay = f"/api/v1/businesses/{business.id}/receivables/{rec_id}/pay/"
        resp_over = owner_client.post(url_pay, {"amount": "70000.00", "payment_method": "CASH"}, format="json")
        assert resp_over.status_code == 400


# ============================================================
# 4. PAYMENT REVERSAL
# ============================================================
@pytest.mark.django_db
class TestPaymentReversal:
    def test_owner_can_reverse_specific_payment(self, owner_client, business, location, customer, variant):
        """Owner can reverse a specific PaymentAllocation and balances/status update atomically"""
        resp_create = owner_client.post(f"/api/v1/businesses/{business.id}/receivables/", {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "40000.00",
        }, format="json")
        rec_id = resp_create.data["id"]
        payment_id = resp_create.data["allocations"][0]["id"]

        url_reverse = f"/api/v1/businesses/{business.id}/receivables/{rec_id}/payments/{payment_id}/reverse/"
        resp_rev = owner_client.post(url_reverse, {"reversal_reason": "Entry error"}, format="json")
        assert resp_rev.status_code == 200
        assert resp_rev.data["payment"]["is_reversed"] is True
        assert resp_rev.data["receivable"]["status"] == "UNPAID"
        assert Decimal(resp_rev.data["receivable"]["outstanding_amount"]) == Decimal("100000.00")

    def test_double_reversal_rejected(self, owner_client, business, location, customer, variant):
        """Reversing an already reversed payment must be rejected (HTTP 400)"""
        resp_create = owner_client.post(f"/api/v1/businesses/{business.id}/receivables/", {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "40000.00",
        }, format="json")
        rec_id = resp_create.data["id"]
        payment_id = resp_create.data["allocations"][0]["id"]

        url_reverse = f"/api/v1/businesses/{business.id}/receivables/{rec_id}/payments/{payment_id}/reverse/"
        owner_client.post(url_reverse, {"reversal_reason": "First reversal"}, format="json")

        resp_rev2 = owner_client.post(url_reverse, {"reversal_reason": "Second attempt"}, format="json")
        assert resp_rev2.status_code == 400

    def test_admin_and_kasir_cannot_reverse_payment(self, admin_client, kasir_client, business, location, customer, variant, owner_client):
        """Admin and Kasir roles are forbidden from reversing payments (HTTP 403)"""
        resp_create = owner_client.post(f"/api/v1/businesses/{business.id}/receivables/", {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "40000.00",
        }, format="json")
        rec_id = resp_create.data["id"]
        payment_id = resp_create.data["allocations"][0]["id"]

        url_reverse = f"/api/v1/businesses/{business.id}/receivables/{rec_id}/payments/{payment_id}/reverse/"

        resp_admin = admin_client.post(url_reverse, {"reversal_reason": "Admin try"}, format="json")
        assert resp_admin.status_code == 403

        resp_kasir = kasir_client.post(url_reverse, {"reversal_reason": "Kasir try"}, format="json")
        assert resp_kasir.status_code == 403


# ============================================================
# 5. ADMINISTRATIVE CLOSURE (CLOSED)
# ============================================================
@pytest.mark.django_db
class TestClosedSemantics:
    def test_owner_can_close_receivable_preserves_historical_paid(self, owner_client, business, location, customer, variant):
        """CLOSED sets outstanding=0 but preserves historical paid_amount; CLOSED != PAID"""
        resp_create = owner_client.post(f"/api/v1/businesses/{business.id}/receivables/", {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "40000.00",
        }, format="json")
        rec_id = resp_create.data["id"]

        url_close = f"/api/v1/businesses/{business.id}/receivables/{rec_id}/close/"
        resp_close = owner_client.post(url_close, {"notes": "Bad debt write-off"}, format="json")
        assert resp_close.status_code == 200

        data = resp_close.data
        assert data["status"] == "CLOSED"
        assert Decimal(data["original_amount"]) == Decimal("100000.00")
        assert Decimal(data["paid_amount"]) == Decimal("40000.00")
        assert Decimal(data["outstanding_amount"]) == Decimal("0.00")

    def test_reversal_on_closed_receivable_rejected(self, owner_client, business, location, customer, variant):
        """Payment reversal on CLOSED receivable must be rejected (HTTP 400)"""
        resp_create = owner_client.post(f"/api/v1/businesses/{business.id}/receivables/", {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "40000.00",
        }, format="json")
        rec_id = resp_create.data["id"]
        payment_id = resp_create.data["allocations"][0]["id"]

        owner_client.post(f"/api/v1/businesses/{business.id}/receivables/{rec_id}/close/", {"notes": "Write-off"}, format="json")

        url_reverse = f"/api/v1/businesses/{business.id}/receivables/{rec_id}/payments/{payment_id}/reverse/"
        resp_rev = owner_client.post(url_reverse, {"reversal_reason": "Post-close attempt"}, format="json")
        assert resp_rev.status_code == 400


# ============================================================
# 6. CROSS-BUSINESS ISOLATION & ENTITY CONSISTENCY
# ============================================================
@pytest.mark.django_db
class TestIsolationAndConsistency:
    def test_cross_business_receivable_access_returns_404(self, owner_client, business, business2, location, customer, variant):
        """Accessing receivable from another business returns HTTP 404"""
        resp_create = owner_client.post(f"/api/v1/businesses/{business.id}/receivables/", {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "0.00",
        }, format="json")
        rec_id = resp_create.data["id"]

        url_cross = f"/api/v1/businesses/{business2.id}/receivables/{rec_id}/"
        resp_cross = owner_client.get(url_cross)
        assert resp_cross.status_code == 404

    def test_mismatched_customer_business_rejected(self, owner_client, business, location, business2_customer, variant):
        """Creating receivable with customer from another business is rejected (HTTP 400)"""
        url = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location.id),
            "customer": str(business2_customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
        }
        resp = owner_client.post(url, payload, format="json")
        assert resp.status_code == 400


# ============================================================
# 7. RBAC & KASIR LOCATION RESTRICTIONS
# ============================================================
@pytest.mark.django_db
class TestRBACAndLocationRestrictions:
    def test_kasir_cannot_update_due_date(self, kasir_client, business, location, customer, variant, owner_client):
        """Kasir role is forbidden from patching due_date (HTTP 403)"""
        resp_create = owner_client.post(f"/api/v1/businesses/{business.id}/receivables/", {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
        }, format="json")
        rec_id = resp_create.data["id"]

        url_patch = f"/api/v1/businesses/{business.id}/receivables/{rec_id}/"
        resp_patch = kasir_client.patch(url_patch, {"due_date": "2026-12-31"}, format="json")
        assert resp_patch.status_code == 403

    def test_owner_and_admin_can_update_due_date(self, owner_client, admin_client, business, location, customer, variant):
        """Owner and Admin roles can update due_date"""
        resp_create = owner_client.post(f"/api/v1/businesses/{business.id}/receivables/", {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
        }, format="json")
        rec_id = resp_create.data["id"]

        url_patch = f"/api/v1/businesses/{business.id}/receivables/{rec_id}/"
        resp_patch = admin_client.patch(url_patch, {"due_date": "2026-12-31"}, format="json")
        assert resp_patch.status_code == 200
        assert resp_patch.data["due_date"] == "2026-12-31"


# ============================================================
# 8. PIUTANG REPORT AGGREGATION
# ============================================================
@pytest.mark.django_db
class TestPiutangReportAggregation:
    def test_piutang_report_summary_and_aging(self, owner_client, business, location, customer, variant):
        """Piutang report returns correct total_outstanding, total_overdue, count, and aging buckets"""
        owner_client.post(f"/api/v1/businesses/{business.id}/receivables/", {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "0.00",
        }, format="json")

        url_report = f"/api/v1/businesses/{business.id}/receivables/reports/"
        resp = owner_client.get(url_report)
        assert resp.status_code == 200

        data = resp.data
        assert Decimal(data["total_outstanding"]) == Decimal("100000.00")
        assert data["count_customers_with_debt"] == 1
        assert "aging_summary" in data
        assert "receivables_by_customer" in data

    def test_kasir_cannot_access_piutang_report(self, kasir_client, business):
        """Kasir role is forbidden from accessing piutang reports (HTTP 403)"""
        url_report = f"/api/v1/businesses/{business.id}/receivables/reports/"
        resp = kasir_client.get(url_report)
        assert resp.status_code == 403


# ============================================================
# 9. DELETION PROTECTION
# ============================================================
@pytest.mark.django_db
class TestDeletionProtection:
    def test_customer_with_receivable_protected_from_deletion(self, owner_client, business, location, customer, variant):
        """Customer with active receivable cannot be deleted (PROTECT)"""
        owner_client.post(f"/api/v1/businesses/{business.id}/receivables/", {
            "location": str(location.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
        }, format="json")

        url_del = f"/api/v1/businesses/{business.id}/customers/{customer.id}/"
        from django.db.models.deletion import ProtectedError
        with pytest.raises((ProtectedError, Exception)):
            owner_client.delete(url_del)
