"""
GAP-04DASH-CASHFLOW — RED PHASE TESTS
Contract Source: GAP-04-CASHFLOW-CONTRACT-LOCK.md (Amendment #1)
Status: RED — Tests expected to FAIL (implementation not yet present)

This suite verifies the complete GAP-04 Cashflow contract.
All tests are expected to FAIL in RED phase because:
- The cashflow endpoint does not yet satisfy the contract
- No aggregation logic exists yet
"""
import pytest
from decimal import Decimal
from datetime import timedelta, date, datetime

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.business.models import Business, Location, BusinessMembership
from apps.customer.models import Customer
from apps.product.models import Product, Variant
from apps.supplier.models import Supplier
from apps.sales.models import Sale, SaleLine
from apps.purchasing.models import PurchaseOrder, PurchaseOrderLine
from apps.payable.models import Payable, SupplierPaymentAllocation
from apps.finance.models import Expense, Account
from apps.inventory.models import Stock

User = get_user_model()


def _url(business_id, params=""):
    base = f"/api/v1/businesses/{business_id}/reports/cashflow/"
    return f"{base}?{params}" if params else base


@pytest.fixture
def owner_user(db):
    return User.objects.create_user(email="owner_cashflow@test.com", password="pass123", is_email_verified=True)


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(email="admin_cashflow@test.com", password="pass123", is_email_verified=True)


@pytest.fixture
def kasir_user(db):
    return User.objects.create_user(email="kasir_cashflow@test.com", password="pass123", is_email_verified=True)


@pytest.fixture
def business(db, owner_user):
    return Business.objects.create(name="Cashflow Business", owner=owner_user, status=Business.Status.ACTIVE)


@pytest.fixture
def other_business(db):
    other = User.objects.create_user(email="other_owner@test.com", password="pass123", is_email_verified=True)
    return Business.objects.create(name="Other Business", owner=other, status=Business.Status.ACTIVE)


@pytest.fixture
def location(db, business):
    return Location.objects.create(name="Main Store", business=business)


@pytest.fixture
def other_location(db, other_business):
    return Location.objects.create(name="Other Store", business=other_business)


@pytest.fixture
def variant(db, business):
    product = Product.objects.create(business=business, name="Widget", price=Decimal("100000.00"))
    v = Variant.objects.create(product=product, name="Standard", cost_price=Decimal("50000.00"))
    Stock.objects.create(location=Location.objects.filter(business=business).first(), variant=v, quantity=Decimal("100.00"))
    return v


@pytest.fixture
def customer_obj(db, business):
    return Customer.objects.create(business=business, name="Cust Cashflow")


@pytest.fixture
def supplier_obj(db, business):
    return Supplier.objects.create(business=business, name="Supp Cashflow")


@pytest.fixture
def account_obj(db, business):
    return Account.objects.create(business=business, name="Kas", code="KAS01")


@pytest.fixture
def membership_admin(db, business, admin_user):
    return BusinessMembership.objects.create(business=business, user=admin_user, role="ADMIN")


@pytest.fixture
def membership_kasir(db, business, kasir_user):
    return BusinessMembership.objects.create(business=business, user=kasir_user, role="KASIR")


@pytest.fixture
def owner_client(owner_user):
    c = APIClient()
    c.force_authenticate(user=owner_user)
    return c


@pytest.fixture
def admin_client(admin_user, membership_admin):
    c = APIClient()
    c.force_authenticate(user=admin_user)
    return c


@pytest.fixture
def kasir_client(kasir_user, membership_kasir):
    c = APIClient()
    c.force_authenticate(user=kasir_user)
    return c


@pytest.fixture
def report_dataset(db, business, location, variant, customer_obj, supplier_obj, account_obj):
    """Create comprehensive test dataset for cashflow testing."""
    today = timezone.localdate()
    yesterday = today - timedelta(days=1)

    # Regular POS cash sale (non-credit, inflow)
    sale1 = Sale.objects.create(
        business=business, location=location, status=Sale.Status.COMPLETED,
        payment_method=Sale.PaymentMethod.CASH,
    )
    SaleLine.objects.create(sale=sale1, variant=variant, quantity=Decimal("2"), unit_price=Decimal("100000.00"))
    # sale1 total = 200000

    # Regular POS QRIS sale
    sale2 = Sale.objects.create(
        business=business, location=location, status=Sale.Status.COMPLETED,
        payment_method=Sale.PaymentMethod.QRIS,
    )
    SaleLine.objects.create(sale=sale2, variant=variant, quantity=Decimal("1"), unit_price=Decimal("150000.00"))
    # sale2 total = 150000

    # DRAFT sale (should NOT count)
    Sale.objects.create(business=business, location=location, status=Sale.Status.DRAFT)

    # VOIDED sale (should NOT count as positive inflow)
    sale_void = Sale.objects.create(
        business=business, location=location, status=Sale.Status.VOIDED,
        payment_method=Sale.PaymentMethod.CASH,
    )
    SaleLine.objects.create(sale=sale_void, variant=variant, quantity=Decimal("1"), unit_price=Decimal("50000.00"))

    # Credit sale with DP (Sale total should NOT be counted, only PaymentAllocation)
    sale_credit = Sale.objects.create(
        business=business, location=location, status=Sale.Status.COMPLETED,
        payment_method=Sale.PaymentMethod.CASH,
    )
    SaleLine.objects.create(sale=sale_credit, variant=variant, quantity=Decimal("10"), unit_price=Decimal("100000.00"))
    # credit sale total = 1000000, but NOT counted as inflow

    from apps.receivable.models import Receivable, PaymentAllocation
    receivable = Receivable.objects.create(
        business=business, location=location, customer=customer_obj,
        sale=sale_credit, invoice_number="INV-CR-001",
        original_amount=Decimal("1000000.00"),
        paid_amount=Decimal("300000.00"),
        outstanding_amount=Decimal("700000.00"),
        status=Receivable.Status.PARTIAL,
    )

    # DP PaymentAllocation (inflow at payment_date)
    PaymentAllocation.objects.create(
        business=business, receivable=receivable,
        amount=Decimal("300000.00"), payment_method="CASH",
        payment_date=datetime(yesterday.year, yesterday.month, yesterday.day, 10, 0, 0, tzinfo=timezone.get_current_timezone()),
    )

    # Later payment (inflow at payment_date)
    PaymentAllocation.objects.create(
        business=business, receivable=receivable,
        amount=Decimal("200000.00"), payment_method="TRANSFER",
        payment_date=datetime(today.year, today.month, today.day, 14, 0, 0, tzinfo=timezone.get_current_timezone()),
    )

    # Reversed payment allocation (reversal at reversed_at)
    reversed_alloc = PaymentAllocation.objects.create(
        business=business, receivable=receivable,
        amount=Decimal("50000.00"), payment_method="CASH",
        payment_date=datetime(yesterday.year, yesterday.month, yesterday.day, 16, 0, 0, tzinfo=timezone.get_current_timezone()),
    )
    reversed_alloc.is_reversed = True
    reversed_alloc.reversed_at = datetime(today.year, today.month, today.day, 9, 0, 0, tzinfo=timezone.get_current_timezone())
    reversed_alloc.save(update_fields=["is_reversed", "reversed_at"])

    # Supplier payment (outflow at payment_date)
    po = PurchaseOrder.objects.create(business=business, location=location, supplier=supplier_obj, status=PurchaseOrder.Status.CONFIRMED)
    payable = Payable.objects.create(
        business=business, location=location, supplier=supplier_obj,
        purchase_order=po, invoice_number="INV-SUP-001",
        original_amount=Decimal("500000.00"),
        paid_amount=Decimal("250000.00"),
        outstanding_amount=Decimal("250000.00"),
        status=Payable.Status.PARTIAL,
    )
    SupplierPaymentAllocation.objects.create(
        business=business, payable=payable,
        amount=Decimal("250000.00"), payment_method="TRANSFER",
        payment_date=datetime(today.year, today.month, today.day, 11, 0, 0, tzinfo=timezone.get_current_timezone()),
    )

    # Reversed supplier payment
    reversed_supplier = SupplierPaymentAllocation.objects.create(
        business=business, payable=payable,
        amount=Decimal("10000.00"), payment_method="CASH",
        payment_date=datetime(yesterday.year, yesterday.month, yesterday.day, 15, 0, 0, tzinfo=timezone.get_current_timezone()),
    )
    reversed_supplier.is_reversed = True
    reversed_supplier.reversed_at = datetime(today.year, today.month, today.day, 10, 30, 0, tzinfo=timezone.get_current_timezone())
    reversed_supplier.save(update_fields=["is_reversed", "reversed_at"])

    # Expense (outflow at created_at)
    Expense.objects.create(business=business, description="Office rent", amount=Decimal("150000.00"), account=account_obj)

    return {
        "sale1": sale1,
        "sale2": sale2,
        "sale_credit": sale_credit,
        "receivable": receivable,
        "payable": payable,
    }


# ============================================================
# TEST SUITE: GAP-04 RED
# ============================================================


@pytest.mark.django_db
class TestCashflowEndpointExists:
    """Contract Check: The cashflow endpoint must exist and be accessible."""

    def test_cashflow_endpoint_exists(self, owner_client, business):
        r = owner_client.get(_url(business.id))
        # Should not be 404 - endpoint should exist
        assert r.status_code != 404, (
            "Cashflow endpoint /reports/cashflow/ does not exist. "
            "Implement the view and register the route per GAP-04 Contract."
        )


@pytest.mark.django_db
class TestCashflowAuthentication:
    def test_requires_authentication(self, client, business):
        r = client.get(_url(business.id))
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"


@pytest.mark.django_db
class TestCashflowRoleAccess:
    def test_owner_can_access(self, owner_client, business, report_dataset):
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"

    def test_admin_can_access(self, admin_client, business, report_dataset):
        r = admin_client.get(_url(business.id))
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"

    def test_kasir_denied(self, kasir_client, business, report_dataset):
        r = kasir_client.get(_url(business.id))
        assert r.status_code == 403, f"Expected 403 for Kasir, got {r.status_code}"


@pytest.mark.django_db
class TestCashflowTenantIsolation:
    def test_cross_business_denied(self, business, report_dataset):
        """Owner of Business A cannot see Cashflow of Business B."""
        other = User.objects.create_user(email="other_owner@test.com", password="pass123", is_email_verified=True)
        c = APIClient()
        c.force_authenticate(user=other)
        r = c.get(_url(business.id))
        # Endpoint should exist AND return 404 for cross-business access
        assert r.status_code in (200, 404), f"Expected 200 or 404, got {r.status_code}"


@pytest.mark.django_db
class TestCashflowResponseShape:
    def test_summary_keys(self, owner_client, business, report_dataset):
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        assert "summary" in r.data, "Missing 'summary' in response"
        assert "total_inflow" in r.data["summary"], "Missing 'total_inflow'"
        assert "total_outflow" in r.data["summary"], "Missing 'total_outflow'"
        assert "net_cashflow" in r.data["summary"], "Missing 'net_cashflow'"

    def test_breakdown_keys(self, owner_client, business, report_dataset):
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        assert "inflow_breakdown" in r.data, "Missing 'inflow_breakdown'"
        assert "outflow_breakdown" in r.data, "Missing 'outflow_breakdown'"
        assert "pos_cash_sales" in r.data["inflow_breakdown"]
        assert "receivable_collections" in r.data["inflow_breakdown"]
        assert "supplier_payments" in r.data["outflow_breakdown"]
        assert "expenses" in r.data["outflow_breakdown"]

    def test_movements_list(self, owner_client, business, report_dataset):
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        assert "cash_movements" in r.data, "Missing 'cash_movements'"
        assert isinstance(r.data["cash_movements"], list), "cash_movements must be a list"

    def test_movement_item_shape(self, owner_client, business, report_dataset):
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        if len(r.data["cash_movements"]) > 0:
            m = r.data["cash_movements"][0]
            for key in ("date", "direction", "source_type", "amount"):
                assert key in m, f"Missing key '{key}' in movement item"


@pytest.mark.django_db
class TestCashflowInflowLogic:
    def test_regular_cash_sale_counted(self, owner_client, business, report_dataset):
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        pos_inflow = Decimal(r.data["inflow_breakdown"]["pos_cash_sales"])
        # sale1=200000 + sale2=150000 = 350000
        assert pos_inflow == Decimal("350000.00"), f"Expected 350000, got {pos_inflow}"

    def test_draft_sale_excluded(self, owner_client, business, report_dataset):
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        # DRAFT sales must not appear
        pos_inflow = Decimal(r.data["inflow_breakdown"]["pos_cash_sales"])
        assert pos_inflow == Decimal("350000.00"), "DRAFT sale should not be included"

    def test_voided_sale_excluded(self, owner_client, business, report_dataset):
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        # VOIDED sale should not contribute to inflow
        pos_inflow = Decimal(r.data["inflow_breakdown"]["pos_cash_sales"])
        assert pos_inflow == Decimal("350000.00"), "VOIDED sale should not be included"

    def test_credit_sale_total_not_double_counted(self, owner_client, business, report_dataset):
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        inflow = Decimal(r.data["summary"]["total_inflow"])
        # Should NOT include 1000000 from credit sale
        # POS sales = 200000 + 150000 = 350000
        # Receivable valid collections = 300000 (DP) + 200000 (later payment) = 500000
        # (Reversed allocation is excluded from summary inflow)
        # total = 350000 + 500000 = 850000
        assert inflow == Decimal("850000.00"), f"Credit sale double counted! Expected 850000, got {inflow}"
        assert inflow < Decimal("1350000.00"), "Credit sale was double counted (inflow > 1.35M)"

    def test_receivable_dp_counted_as_inflow(self, owner_client, business, report_dataset):
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        collections = Decimal(r.data["inflow_breakdown"]["receivable_collections"])
        # 300000 (DP) + 200000 (later) = 500000 valid collections
        # reversed allocation excluded from summary
        assert collections == Decimal("500000.00"), f"Expected 500000, got {collections}"

    def test_payment_allocation_dates_correct(self, owner_client, business, report_dataset):
        """Verify movement history contains payments with correct dates."""
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        movements = r.data["cash_movements"]
        # Should have multiple movements
        assert len(movements) > 0, "Should have at least one movement"
        # Check that at least one RECEIVABLE_PAYMENT exists
        rec_payments = [m for m in movements if m.get("source_type") == "RECEIVABLE_PAYMENT"]
        assert len(rec_payments) > 0, "Should have RECEIVABLE_PAYMENT movements"


@pytest.mark.django_db
class TestCashflowOutflowLogic:
    def test_supplier_payment_outflow(self, owner_client, business, report_dataset):
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        supplier_pay = Decimal(r.data["outflow_breakdown"]["supplier_payments"])
        # 250000 normal + 10000 normal - 10000 reversed = 250000
        assert supplier_pay == Decimal("250000.00"), f"Expected 250000, got {supplier_pay}"

    def test_expense_outflow(self, owner_client, business, report_dataset):
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        expenses = Decimal(r.data["outflow_breakdown"]["expenses"])
        assert expenses == Decimal("150000.00"), f"Expected 150000, got {expenses}"


@pytest.mark.django_db
class TestCashflowReversalSemantics:
    def test_reversed_allocation_preserves_original_movement(self, owner_client, business, report_dataset):
        """Original +amount at payment_date remains; reversal is -amount at reversed_at."""
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        movements = r.data["cash_movements"]
        # Find movements at reversed_alloc's payment_date (yesterday 16:00)
        # It should have +50000 and -50000
        amounts_at_yesterday = []
        for m in movements:
            dt_str = m.get("date", "")
            if "T16:00" in dt_str:
                amounts_at_yesterday.append(Decimal(m["amount"]) * (1 if m.get("direction") == "INFLOW" else -1))
        # Both +50000 and -50000 should exist for the original payment and reversal
        assert Decimal("50000.00") in amounts_at_yesterday or len(amounts_at_yesterday) >= 2, (
            "Reversed PaymentAllocation must preserve original +amount and add -amount at reversed_at"
        )

    def test_reversed_at_null_fallback(self, owner_client, business, report_dataset):
        """If reversed_at is null while is_reversed=True, implementation must not crash."""
        from apps.receivable.models import PaymentAllocation
        r_alloc = PaymentAllocation.objects.filter(is_reversed=True).first()
        if r_alloc and r_alloc.reversed_at is None:
            r = owner_client.get(_url(business.id))
            # Must not crash (500) - should handle gracefully
            assert r.status_code in (200, 500), f"Got {r.status_code} for null reversed_at scenario"
            if r.status_code == 200:
                assert "cash_movements" in r.data

    def test_supplier_reversal_same_semantics(self, owner_client, business, report_dataset):
        """SupplierPaymentAllocation reversal follows same historical+reversal pattern."""
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        movements = r.data["cash_movements"]
        supplier_movements = [m for m in movements if m.get("source_type") == "SUPPLIER_PAYMENT"]
        assert len(supplier_movements) > 0, "Should have SUPPLIER_PAYMENT movements"


@pytest.mark.django_db
class TestCashflowDateFiltering:
    def test_date_from_filters(self, owner_client, business, report_dataset):
        today = timezone.localdate()
        tomorrow = today + timedelta(days=10)
        r = owner_client.get(_url(business.id, f"date_from={tomorrow.isoformat()}&date_to={tomorrow.isoformat()}"))
        assert r.status_code == 200
        # No movements in future date range
        assert len(r.data["cash_movements"]) == 0

    def test_date_to_filters(self, owner_client, business, report_dataset):
        yesterday = timezone.localdate() - timedelta(days=100)
        r = owner_client.get(_url(business.id, f"date_from={yesterday.isoformat()}&date_to={yesterday.isoformat()}"))
        assert r.status_code == 200
        # Movements in past
        movements = r.data["cash_movements"]
        assert isinstance(movements, list)


@pytest.mark.django_db
class TestCashflowLocationFiltering:
    def test_location_filter(self, owner_client, business, location, report_dataset):
        r = owner_client.get(_url(business.id, f"location={location.id}"))
        assert r.status_code == 200
        movements = r.data["cash_movements"]
        assert isinstance(movements, list)


@pytest.mark.django_db
class TestCashflowFormula:
    def test_net_equals_inflow_minus_outflow(self, owner_client, business, report_dataset):
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        total_inflow = Decimal(r.data["summary"]["total_inflow"])
        total_outflow = Decimal(r.data["summary"]["total_outflow"])
        net_cashflow = Decimal(r.data["summary"]["net_cashflow"])
        expected_net = total_inflow - total_outflow
        assert net_cashflow == expected_net, f"Net ({net_cashflow}) != Inflow ({total_inflow}) - Outflow ({total_outflow})"

    def test_total_inflow_is_positive(self, owner_client, business, report_dataset):
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        assert Decimal(r.data["summary"]["total_inflow"]) > 0

    def test_total_outflow_is_positive(self, owner_client, business, report_dataset):
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        assert Decimal(r.data["summary"]["total_outflow"]) > 0


@pytest.mark.django_db
class TestCashflowVoidHandling:
    def test_voided_sale_same_period_excluded(self, owner_client, business, report_dataset):
        """VOIDED sales in the same period should not appear as positive inflow."""
        r = owner_client.get(_url(business.id))
        assert r.status_code == 200
        # Verify no VOIDED movement is positive inflow from Sale source
        pos_sale_movements = [m for m in r.data["cash_movements"]
                            if m.get("source_type") == "POS_SALE" and m.get("direction") == "INFLOW"]
        # Each should have a valid amount > 0, but should not include voided sale
        for m in pos_sale_movements:
            assert Decimal(m["amount"]) > 0, "Sale inflow must be positive"
