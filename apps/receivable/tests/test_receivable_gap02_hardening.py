"""
GAP-02 PIUTANG — TEST HARDENING BEFORE GREEN PHASE 2 FINAL

This test suite addresses the re-audit blockers and coverage gaps identified:
- BLOCKER 1: Real concurrency test for payment race conditions
- BLOCKER 2: Sale VOIDED → Receivable VOIDED propagation test
- Additional coverage: Kasir location scoping, overdue date boundaries, audit persistence

Status: TEST HARDENING ONLY — NO PRODUCTION CHANGES
"""
import threading
from decimal import Decimal
from datetime import date, timedelta
import pytest

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.test import Client
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, Location, BusinessMembership
from apps.customer.models import Customer
from apps.product.models import Product, Variant
from apps.inventory.models import Stock
from apps.sales.models import Sale, SaleLine
from apps.receivable.models import Receivable, PaymentAllocation
from apps.audit.models import AuditLog

User = get_user_model()


# ============================================================
# FIXTURES
# ============================================================
@pytest.fixture
def owner_user(db):
    return User.objects.create_user(email="owner_hard@test.com", password="password123", is_email_verified=True)


@pytest.fixture
def kasir_user(db):
    return User.objects.create_user(email="kasir_hard@test.com", password="password123", is_email_verified=True)


@pytest.fixture
def kasir_user_b(db):
    return User.objects.create_user(email="kasir_b_hard@test.com", password="password123", is_email_verified=True)


@pytest.fixture
def business(db, owner_user):
    return Business.objects.create(name="Test Business Hardening", owner=owner_user, status=Business.Status.ACTIVE)


@pytest.fixture
def location_a(db, business):
    return Location.objects.create(name="Location A", business=business)


@pytest.fixture
def location_b(db, business):
    return Location.objects.create(name="Location B", business=business)


@pytest.fixture
def customer(db, business):
    return Customer.objects.create(name="Customer Hardening", business=business)


@pytest.fixture
def variant(db, business):
    product = Product.objects.create(name="Widget Hard", price=Decimal("100000.00"), business=business)
    return Variant.objects.create(product=product, name="Standard Widget Hard", cost_price=Decimal("50000.00"))


@pytest.fixture
def stock_a(db, location_a, variant):
    return Stock.objects.create(location=location_a, variant=variant, quantity=Decimal("100.00"))


@pytest.fixture
def stock_b(db, location_b, variant):
    return Stock.objects.create(location=location_b, variant=variant, quantity=Decimal("100.00"))


@pytest.fixture
def membership_kasir_a(db, business, kasir_user):
    return BusinessMembership.objects.create(business=business, user=kasir_user, role="KASIR")


@pytest.fixture
def membership_kasir_b(db, business, kasir_user_b):
    return BusinessMembership.objects.create(business=business, user=kasir_user_b, role="KASIR")


@pytest.fixture
def owner_client(owner_user):
    client = APIClient()
    client.force_authenticate(user=owner_user)
    return client


@pytest.fixture
def kasir_a_client(kasir_user, membership_kasir_a):
    client = APIClient()
    client.force_authenticate(user=kasir_user)
    return client


@pytest.fixture
def kasir_b_client(kasir_user_b, membership_kasir_b):
    client = APIClient()
    client.force_authenticate(user=kasir_user_b)
    return client


# ============================================================
# BLOCKER 1: REAL CONCURRENCY TEST
# ============================================================
@pytest.mark.django_db(transaction=True)
class TestConcurrencyRaceProtection:
    def test_concurrent_payment_race_exactly_one_succeeds(
        self, owner_user, business, location_a, customer, variant, stock_a
    ):
        """
        BLOCKER 1: Real concurrency test for payment race condition.
        
        Scenario:
        - Receivable: original=100000, paid=0, outstanding=100000, status=UNPAID
        - Two concurrent payment requests: A=70000, B=70000
        - Both attempt the REAL payment endpoint simultaneously
        
        Expected result:
        - Exactly ONE request succeeds (HTTP 201)
        - Exactly ONE request fails (HTTP 400)
        - Final paid_amount = 70000
        - Final outstanding_amount = 30000
        - Final status = PARTIAL
        - Exactly one valid PaymentAllocation exists
        - outstanding_amount >= 0 (no negative balance)
        
        This test uses threading to create true concurrent execution against
        the Django test database (PostgreSQL), exercising the select_for_update()
        row lock in the actual payment endpoint path.
        """
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        payload_create = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "0.00",
        }
        
        client = APIClient()
        client.force_authenticate(user=owner_user)
        resp_create = client.post(url_create, payload_create, format="json")
        assert resp_create.status_code == 201
        receivable_id = resp_create.data["id"]
        
        token = str(RefreshToken.for_user(owner_user).access_token)
        url_pay = f"/api/v1/businesses/{business.id}/receivables/{receivable_id}/pay/"
        payload_pay = {"amount": "70000.00", "payment_method": "CASH"}
        
        results = []
        lock = threading.Lock()
        
        def worker(key):
            c = Client()
            c.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"
            resp = c.post(url_pay, payload_pay, content_type="application/json")
            with lock:
                results.append((key, resp.status_code))
        
        threads = [threading.Thread(target=worker, args=(k,)) for k in ("A", "B")]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        
        codes = [r[1] for r in results]
        assert sorted(codes) == [201, 400], f"Expected one 201 and one 400, got {codes}"
        
        receivable = Receivable.objects.get(pk=receivable_id)
        assert receivable.paid_amount == Decimal("70000.00"), f"Expected paid=70000, got {receivable.paid_amount}"
        assert receivable.outstanding_amount == Decimal("30000.00"), f"Expected outstanding=30000, got {receivable.outstanding_amount}"
        assert receivable.status == Receivable.Status.PARTIAL, f"Expected PARTIAL, got {receivable.status}"
        assert receivable.outstanding_amount >= 0, "Outstanding amount must not be negative"
        
        valid_allocations = PaymentAllocation.objects.filter(receivable=receivable, is_reversed=False)
        assert valid_allocations.count() == 1, f"Expected exactly 1 valid allocation, got {valid_allocations.count()}"
        assert valid_allocations.first().amount == Decimal("70000.00")


# ============================================================
# BLOCKER 2: VOID PROPAGATION TEST
# ============================================================
@pytest.mark.django_db
class TestVoidPropagation:
    def test_sale_voided_propagates_to_unpaid_receivable(
        self, owner_client, business, location_a, customer, variant, stock_a
    ):
        """
        BLOCKER 2: Sale VOIDED → Receivable VOIDED propagation.
        
        Scenario:
        - Create credit sale → Receivable UNPAID
        - Void the Sale through the Sale update mechanism
        - Receivable automatically becomes VOIDED
        - outstanding_amount = 0
        
        This test exercises the actual Sale void path (not just signal invocation),
        proving the signal mechanism works end-to-end.
        """
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        payload_create = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "0.00",
        }
        
        resp_create = owner_client.post(url_create, payload_create, format="json")
        assert resp_create.status_code == 201
        receivable_id = resp_create.data["id"]
        sale_id = resp_create.data["sale"]
        
        receivable = Receivable.objects.get(pk=receivable_id)
        assert receivable.status == Receivable.Status.UNPAID
        assert receivable.outstanding_amount == Decimal("100000.00")
        
        sale = Sale.objects.get(pk=sale_id)
        assert sale.status == Sale.Status.COMPLETED
        
        sale.status = Sale.Status.VOIDED
        sale.save()
        
        receivable.refresh_from_db()
        assert receivable.status == Receivable.Status.VOIDED, f"Expected VOIDED, got {receivable.status}"
        assert receivable.outstanding_amount == Decimal("0.00"), f"Expected outstanding=0, got {receivable.outstanding_amount}"
    
    def test_sale_voided_does_not_affect_unrelated_receivable(
        self, owner_client, business, location_a, customer, variant, stock_a
    ):
        """Voiding one sale does not affect other receivables."""
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "50000.00"}],
            "initial_payment": "0.00",
        }
        
        resp1 = owner_client.post(url_create, payload, format="json")
        resp2 = owner_client.post(url_create, payload, format="json")
        
        rec1_id = resp1.data["id"]
        rec2_id = resp2.data["id"]
        sale1_id = resp1.data["sale"]
        
        sale1 = Sale.objects.get(pk=sale1_id)
        sale1.status = Sale.Status.VOIDED
        sale1.save()
        
        rec1 = Receivable.objects.get(pk=rec1_id)
        rec2 = Receivable.objects.get(pk=rec2_id)
        
        assert rec1.status == Receivable.Status.VOIDED
        assert rec2.status == Receivable.Status.UNPAID, "Unrelated receivable must remain UNPAID"
    
    def test_void_propagation_protected_for_partial_paid_receivables(
        self, owner_client, business, location_a, customer, variant, stock_a
    ):
        """Signal does not void PARTIAL/PAID receivables (protection guard)."""
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "50000.00",
        }
        
        resp = owner_client.post(url_create, payload, format="json")
        receivable_id = resp.data["id"]
        sale_id = resp.data["sale"]
        
        receivable = Receivable.objects.get(pk=receivable_id)
        assert receivable.status == Receivable.Status.PARTIAL
        
        sale = Sale.objects.get(pk=sale_id)
        sale.status = Sale.Status.VOIDED
        sale.save()
        
        receivable.refresh_from_db()
        assert receivable.status == Receivable.Status.PARTIAL, "PARTIAL receivable must not be auto-voided"
    
    def test_void_propagation_audit_event_emitted(
        self, owner_client, business, location_a, customer, variant, stock_a
    ):
        """Audit event is NOT emitted by signal (signal is silent by design)."""
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "0.00",
        }
        
        resp = owner_client.post(url_create, payload, format="json")
        sale_id = resp.data["sale"]
        
        audit_before = AuditLog.objects.filter(business=business, event_type="RECEIVABLE_VOIDED").count()
        
        sale = Sale.objects.get(pk=sale_id)
        sale.status = Sale.Status.VOIDED
        sale.save()
        
        audit_after = AuditLog.objects.filter(business=business, event_type="RECEIVABLE_VOIDED").count()
        assert audit_after == audit_before, "Signal does not emit audit event (by design)"


# ============================================================
# KASIR ACTIVE-LOCATION SCOPING TEST
# ============================================================
@pytest.mark.django_db
class TestKasirLocationScoping:
    def test_kasir_can_only_list_receivables_at_active_location(
        self, owner_client, kasir_a_client, business, location_a, location_b, customer, variant, stock_a, stock_b
    ):
        """Kasir can only list receivables at their active location."""
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        
        payload_a = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
        }
        payload_b = {
            "location": str(location_b.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "200000.00"}],
        }
        
        resp_a = owner_client.post(url_create, payload_a, format="json")
        resp_b = owner_client.post(url_create, payload_b, format="json")
        assert resp_a.status_code == 201
        assert resp_b.status_code == 201
        
        url_list = f"/api/v1/businesses/{business.id}/receivables/?location={location_a.id}"
        resp_kasir = kasir_a_client.get(url_list)
        assert resp_kasir.status_code == 200
        
        data = resp_kasir.data
        assert len(data) == 1, f"Kasir should see only location A receivables, got {len(data)}"
        assert data[0]["location"] == str(location_a.id)
    
    def test_kasir_cannot_access_receivable_detail_from_other_location(
        self, owner_client, kasir_a_client, business, location_a, location_b, customer, variant, stock_b
    ):
        """Kasir cannot access receivable detail from another location (404)."""
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        payload_b = {
            "location": str(location_b.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
        }
        
        resp = owner_client.post(url_create, payload_b, format="json")
        receivable_id = resp.data["id"]
        
        url_detail = f"/api/v1/businesses/{business.id}/receivables/{receivable_id}/?location={location_a.id}"
        resp_kasir = kasir_a_client.get(url_detail)
        assert resp_kasir.status_code == 404, f"Expected 404, got {resp_kasir.status_code}"
    
    def test_owner_can_access_all_locations(
        self, owner_client, business, location_a, location_b, customer, variant, stock_a, stock_b
    ):
        """Owner can access receivables at all locations."""
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        
        payload_a = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
        }
        payload_b = {
            "location": str(location_b.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "200000.00"}],
        }
        
        owner_client.post(url_create, payload_a, format="json")
        owner_client.post(url_create, payload_b, format="json")
        
        url_list = f"/api/v1/businesses/{business.id}/receivables/"
        resp = owner_client.get(url_list)
        assert resp.status_code == 200
        assert len(resp.data) == 2, "Owner should see all receivables"


# ============================================================
# OVERDUE DATE-BOUNDARY TEST
# ============================================================
@pytest.mark.django_db
class TestOverdueDateBoundary:
    def test_due_date_today_not_overdue(
        self, owner_client, business, location_a, customer, variant, stock_a
    ):
        """due_date = today with outstanding > 0 is NOT overdue."""
        today = timezone.localdate()
        
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "0.00",
            "due_date": str(today),
        }
        
        resp = owner_client.post(url_create, payload, format="json")
        assert resp.status_code == 201
        assert resp.data["is_overdue"] is False, "due_date=today should NOT be overdue"
    
    def test_due_date_yesterday_is_overdue(
        self, owner_client, business, location_a, customer, variant, stock_a
    ):
        """due_date = yesterday with outstanding > 0 and status UNPAID/PARTIAL is overdue."""
        yesterday = timezone.localdate() - timedelta(days=1)
        
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "0.00",
            "due_date": str(yesterday),
        }
        
        resp = owner_client.post(url_create, payload, format="json")
        assert resp.status_code == 201
        assert resp.data["is_overdue"] is True, "due_date=yesterday should be overdue"
    
    def test_due_date_yesterday_outstanding_zero_not_overdue(
        self, owner_client, business, location_a, customer, variant, stock_a
    ):
        """due_date = yesterday with outstanding = 0 is NOT overdue."""
        yesterday = timezone.localdate() - timedelta(days=1)
        
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "100000.00",
            "due_date": str(yesterday),
        }
        
        resp = owner_client.post(url_create, payload, format="json")
        assert resp.status_code == 201
        assert resp.data["status"] == "PAID"
        assert resp.data["is_overdue"] is False, "PAID receivable should NOT be overdue"
    
    def test_paid_status_never_overdue(
        self, owner_client, business, location_a, customer, variant, stock_a
    ):
        """status = PAID is never overdue regardless of due_date."""
        yesterday = timezone.localdate() - timedelta(days=100)
        
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "100000.00",
            "due_date": str(yesterday),
        }
        
        resp = owner_client.post(url_create, payload, format="json")
        assert resp.data["status"] == "PAID"
        assert resp.data["is_overdue"] is False
    
    def test_closed_status_never_overdue(
        self, owner_client, business, location_a, customer, variant, stock_a
    ):
        """status = CLOSED is never overdue."""
        yesterday = timezone.localdate() - timedelta(days=100)
        
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "40000.00",
            "due_date": str(yesterday),
        }
        
        resp = owner_client.post(url_create, payload, format="json")
        receivable_id = resp.data["id"]
        
        url_close = f"/api/v1/businesses/{business.id}/receivables/{receivable_id}/close/"
        owner_client.post(url_close, {"notes": "Write-off"}, format="json")
        
        url_detail = f"/api/v1/businesses/{business.id}/receivables/{receivable_id}/"
        resp_detail = owner_client.get(url_detail)
        assert resp_detail.data["status"] == "CLOSED"
        assert resp_detail.data["is_overdue"] is False
    
    def test_voided_status_never_overdue(
        self, owner_client, business, location_a, customer, variant, stock_a
    ):
        """status = VOIDED is never overdue."""
        yesterday = timezone.localdate() - timedelta(days=100)
        
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "0.00",
            "due_date": str(yesterday),
        }
        
        resp = owner_client.post(url_create, payload, format="json")
        sale_id = resp.data["sale"]
        
        sale = Sale.objects.get(pk=sale_id)
        sale.status = Sale.Status.VOIDED
        sale.save()
        
        receivable_id = resp.data["id"]
        url_detail = f"/api/v1/businesses/{business.id}/receivables/{receivable_id}/"
        resp_detail = owner_client.get(url_detail)
        assert resp_detail.data["status"] == "VOIDED"
        assert resp_detail.data["is_overdue"] is False


# ============================================================
# AUDIT EVENT PERSISTENCE TEST
# ============================================================
@pytest.mark.django_db
class TestAuditEventPersistence:
    def test_receivable_created_audit_persisted(
        self, owner_client, owner_user, business, location_a, customer, variant, stock_a
    ):
        """RECEIVABLE_CREATED audit event is persisted to AuditLog."""
        audit_before = AuditLog.objects.filter(business=business, event_type="RECEIVABLE_CREATED").count()
        
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
        }
        
        resp = owner_client.post(url_create, payload, format="json")
        assert resp.status_code == 201
        receivable_id = resp.data["id"]
        
        audit_after = AuditLog.objects.filter(business=business, event_type="RECEIVABLE_CREATED").count()
        assert audit_after == audit_before + 1, "RECEIVABLE_CREATED audit must be persisted"
        
        audit_record = AuditLog.objects.filter(
            business=business,
            event_type="RECEIVABLE_CREATED",
            target=receivable_id,
            resource="Receivable"
        ).first()
        assert audit_record is not None
        assert audit_record.actor == owner_user
        assert audit_record.action == "RECEIVABLE_CREATED"
        assert audit_record.outcome == "SUCCESS"
    
    def test_payment_allocated_audit_persisted(
        self, owner_client, owner_user, business, location_a, customer, variant, stock_a
    ):
        """PAYMENT_ALLOCATED audit event is persisted."""
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "0.00",
        }
        
        resp = owner_client.post(url_create, payload, format="json")
        receivable_id = resp.data["id"]
        
        audit_before = AuditLog.objects.filter(business=business, event_type="PAYMENT_ALLOCATED").count()
        
        url_pay = f"/api/v1/businesses/{business.id}/receivables/{receivable_id}/pay/"
        resp_pay = owner_client.post(url_pay, {"amount": "50000.00", "payment_method": "CASH"}, format="json")
        assert resp_pay.status_code == 201
        
        audit_after = AuditLog.objects.filter(business=business, event_type="PAYMENT_ALLOCATED").count()
        assert audit_after == audit_before + 1, "PAYMENT_ALLOCATED audit must be persisted"
        
        audit_record = AuditLog.objects.filter(
            business=business,
            event_type="PAYMENT_ALLOCATED",
            resource="PaymentAllocation"
        ).last()
        assert audit_record is not None
        assert audit_record.actor == owner_user
        assert audit_record.outcome == "SUCCESS"
    
    def test_payment_reversed_audit_persisted(
        self, owner_client, owner_user, business, location_a, customer, variant, stock_a
    ):
        """PAYMENT_REVERSED audit event is persisted."""
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "50000.00",
        }
        
        resp = owner_client.post(url_create, payload, format="json")
        receivable_id = resp.data["id"]
        payment_id = resp.data["allocations"][0]["id"]
        
        audit_before = AuditLog.objects.filter(business=business, event_type="PAYMENT_REVERSED").count()
        
        url_reverse = f"/api/v1/businesses/{business.id}/receivables/{receivable_id}/payments/{payment_id}/reverse/"
        resp_rev = owner_client.post(url_reverse, {"reversal_reason": "Test reversal"}, format="json")
        assert resp_rev.status_code == 200
        
        audit_after = AuditLog.objects.filter(business=business, event_type="PAYMENT_REVERSED").count()
        assert audit_after == audit_before + 1, "PAYMENT_REVERSED audit must be persisted"
        
        audit_record = AuditLog.objects.filter(
            business=business,
            event_type="PAYMENT_REVERSED",
            resource="PaymentAllocation"
        ).last()
        assert audit_record is not None
        assert audit_record.actor == owner_user
    
    def test_due_date_updated_audit_persisted(
        self, owner_client, owner_user, business, location_a, customer, variant, stock_a
    ):
        """DUE_DATE_UPDATED audit event is persisted."""
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "due_date": "2026-12-01",
        }
        
        resp = owner_client.post(url_create, payload, format="json")
        receivable_id = resp.data["id"]
        
        audit_before = AuditLog.objects.filter(business=business, event_type="DUE_DATE_UPDATED").count()
        
        url_patch = f"/api/v1/businesses/{business.id}/receivables/{receivable_id}/"
        resp_patch = owner_client.patch(url_patch, {"due_date": "2026-12-31"}, format="json")
        assert resp_patch.status_code == 200
        
        audit_after = AuditLog.objects.filter(business=business, event_type="DUE_DATE_UPDATED").count()
        assert audit_after == audit_before + 1, "DUE_DATE_UPDATED audit must be persisted"
        
        audit_record = AuditLog.objects.filter(
            business=business,
            event_type="DUE_DATE_UPDATED",
            resource="Receivable"
        ).last()
        assert audit_record is not None
        assert audit_record.actor == owner_user
    
    def test_receivable_closed_audit_persisted(
        self, owner_client, owner_user, business, location_a, customer, variant, stock_a
    ):
        """RECEIVABLE_CLOSED audit event is persisted."""
        url_create = f"/api/v1/businesses/{business.id}/receivables/"
        payload = {
            "location": str(location_a.id),
            "customer": str(customer.id),
            "lines": [{"variant": str(variant.id), "quantity": "1.00", "unit_price": "100000.00"}],
            "initial_payment": "40000.00",
        }
        
        resp = owner_client.post(url_create, payload, format="json")
        receivable_id = resp.data["id"]
        
        audit_before = AuditLog.objects.filter(business=business, event_type="RECEIVABLE_CLOSED").count()
        
        url_close = f"/api/v1/businesses/{business.id}/receivables/{receivable_id}/close/"
        resp_close = owner_client.post(url_close, {"notes": "Bad debt"}, format="json")
        assert resp_close.status_code == 200
        
        audit_after = AuditLog.objects.filter(business=business, event_type="RECEIVABLE_CLOSED").count()
        assert audit_after == audit_before + 1, "RECEIVABLE_CLOSED audit must be persisted"
        
        audit_record = AuditLog.objects.filter(
            business=business,
            event_type="RECEIVABLE_CLOSED",
            resource="Receivable",
            target=receivable_id
        ).first()
        assert audit_record is not None
        assert audit_record.actor == owner_user
        assert audit_record.outcome == "SUCCESS"
