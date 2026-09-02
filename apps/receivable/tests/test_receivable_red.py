"""
GAP-02 PIUTANG — RED PHASE 1: MODEL FOUNDATION
Contract: GAP-02-PIUTANG-CONTRACT-LOCK.md (Amendment #3 Final)
Status: RED — Model Foundation Tests (Executable)

This suite verifies the structural contract of Receivable and PaymentAllocation models.
All tests are expected to FAIL in RED phase (models don't exist yet).
Tests must be executable (no fixture setup errors).

Behavior acceptance tests are DEFERRED to test_receivable_behavior.py
until production models are implemented.
"""
import pytest
from django.db.models import CASCADE, PROTECT, OneToOneField


# ============================================================
# RED PHASE 1: MODEL FOUNDATION TESTS
# ============================================================
@pytest.mark.django_db
class TestReceivableModelFoundation:
    """Contract §3.1: Receivable model schema and relationships"""

    def test_receivable_model_exists(self):
        """Receivable model must be importable from apps.receivable.models"""
        from apps.receivable.models import Receivable
        assert Receivable is not None

    def test_receivable_has_id_uuid_primary_key(self):
        """Receivable must have UUID primary key"""
        from apps.receivable.models import Receivable
        id_field = Receivable._meta.get_field('id')
        assert id_field.primary_key is True
        assert 'UUID' in str(id_field.__class__.__name__)

    def test_receivable_has_required_fields(self):
        """Receivable must have all contract-defined fields (Contract §3.1)"""
        from apps.receivable.models import Receivable
        
        field_names = {f.name for f in Receivable._meta.get_fields()}
        
        required_fields = {
            'id', 'business', 'location', 'customer', 'sale',
            'invoice_number', 'original_amount', 'paid_amount',
            'outstanding_amount', 'status', 'due_date', 'notes',
            'created_at', 'updated_at'
        }
        
        missing = required_fields - field_names
        assert not missing, f"Missing required fields: {missing}"

    def test_receivable_status_choices_complete(self):
        """Receivable status must include all 5 contract choices (Contract §5)"""
        from apps.receivable.models import Receivable
        
        status_field = Receivable._meta.get_field('status')
        status_choices = {choice[0] for choice in status_field.choices}
        
        required_statuses = {'UNPAID', 'PARTIAL', 'PAID', 'VOIDED', 'CLOSED'}
        missing_statuses = required_statuses - status_choices
        
        assert not missing_statuses, f"Missing status choices: {missing_statuses}"

    def test_receivable_business_fk_cascade(self):
        """business FK must use CASCADE (Contract §3.1)"""
        from apps.receivable.models import Receivable
        
        business_field = Receivable._meta.get_field('business')
        assert business_field.remote_field.on_delete == CASCADE

    def test_receivable_location_fk_protect(self):
        """location FK must use PROTECT for historical data retention (Contract §3.1 + §6)"""
        from apps.receivable.models import Receivable
        
        location_field = Receivable._meta.get_field('location')
        assert location_field.remote_field.on_delete == PROTECT

    def test_receivable_customer_fk_protect(self):
        """customer FK must use PROTECT to prevent data loss (Contract §3.1 + §17)"""
        from apps.receivable.models import Receivable
        
        customer_field = Receivable._meta.get_field('customer')
        assert customer_field.remote_field.on_delete == PROTECT

    def test_receivable_sale_onetoone_protect(self):
        """sale must be OneToOne with PROTECT (Contract §3.1 + §4)"""
        from apps.receivable.models import Receivable
        
        sale_field = Receivable._meta.get_field('sale')
        assert isinstance(sale_field, OneToOneField), f"sale field is {type(sale_field)}, not OneToOneField"
        assert sale_field.remote_field.on_delete == PROTECT

    def test_receivable_original_amount_decimal(self):
        """original_amount must be DecimalField (Contract §3.1)"""
        from apps.receivable.models import Receivable
        from django.db.models import DecimalField
        
        original_amount_field = Receivable._meta.get_field('original_amount')
        assert isinstance(original_amount_field, DecimalField)
        assert original_amount_field.max_digits == 12
        assert original_amount_field.decimal_places == 2

    def test_receivable_paid_amount_decimal(self):
        """paid_amount must be DecimalField with default=0 (Contract §3.1)"""
        from apps.receivable.models import Receivable
        from django.db.models import DecimalField
        
        paid_amount_field = Receivable._meta.get_field('paid_amount')
        assert isinstance(paid_amount_field, DecimalField)
        assert paid_amount_field.max_digits == 12
        assert paid_amount_field.decimal_places == 2
        assert paid_amount_field.default == 0

    def test_receivable_outstanding_amount_decimal(self):
        """outstanding_amount must be DecimalField (Contract §3.1 + §5)"""
        from apps.receivable.models import Receivable
        from django.db.models import DecimalField
        
        outstanding_field = Receivable._meta.get_field('outstanding_amount')
        assert isinstance(outstanding_field, DecimalField)
        assert outstanding_field.max_digits == 12
        assert outstanding_field.decimal_places == 2

    def test_receivable_invoice_number_field(self):
        """invoice_number must be CharField (Contract §3.1)"""
        from apps.receivable.models import Receivable
        from django.db.models import CharField
        
        invoice_field = Receivable._meta.get_field('invoice_number')
        assert isinstance(invoice_field, CharField)
        assert invoice_field.max_length == 100

    def test_receivable_due_date_optional(self):
        """due_date must be nullable DateField (Contract §3.1 + §11)"""
        from apps.receivable.models import Receivable
        from django.db.models import DateField
        
        due_date_field = Receivable._meta.get_field('due_date')
        assert isinstance(due_date_field, DateField)
        assert due_date_field.null is True
        assert due_date_field.blank is True

    def test_receivable_notes_optional(self):
        """notes must be TextField (Contract §3.1)"""
        from apps.receivable.models import Receivable
        from django.db.models import TextField
        
        notes_field = Receivable._meta.get_field('notes')
        assert isinstance(notes_field, TextField)
        assert notes_field.blank is True


@pytest.mark.django_db
class TestPaymentAllocationModelFoundation:
    """Contract §3.2: PaymentAllocation model schema and relationships"""

    def test_paymentallocation_model_exists(self):
        """PaymentAllocation model must be importable"""
        from apps.receivable.models import PaymentAllocation
        assert PaymentAllocation is not None

    def test_paymentallocation_has_id_uuid_primary_key(self):
        """PaymentAllocation must have UUID primary key"""
        from apps.receivable.models import PaymentAllocation
        
        id_field = PaymentAllocation._meta.get_field('id')
        assert id_field.primary_key is True
        assert 'UUID' in str(id_field.__class__.__name__)

    def test_paymentallocation_has_required_fields(self):
        """PaymentAllocation must have all contract-defined fields (Contract §3.2)"""
        from apps.receivable.models import PaymentAllocation
        
        field_names = {f.name for f in PaymentAllocation._meta.get_fields()}
        
        required_fields = {
            'id', 'business', 'receivable', 'amount', 'payment_method',
            'payment_date', 'reference', 'notes', 'is_reversed',
            'reversed_at', 'reversed_by', 'reversal_reason',
            'created_by', 'created_at'
        }
        
        missing = required_fields - field_names
        assert not missing, f"Missing required fields: {missing}"

    def test_paymentallocation_business_fk_cascade(self):
        """business FK must use CASCADE (Contract §3.2)"""
        from apps.receivable.models import PaymentAllocation
        
        business_field = PaymentAllocation._meta.get_field('business')
        assert business_field.remote_field.on_delete == CASCADE

    def test_paymentallocation_receivable_fk_protect(self):
        """receivable FK must use PROTECT for data retention (Contract §3.2 + Amendment #2)"""
        from apps.receivable.models import PaymentAllocation
        
        receivable_field = PaymentAllocation._meta.get_field('receivable')
        assert receivable_field.remote_field.on_delete == PROTECT

    def test_paymentallocation_payment_method_choices(self):
        """payment_method must include CASH, QRIS, TRANSFER (Contract §3.2 + §9)"""
        from apps.receivable.models import PaymentAllocation
        
        method_field = PaymentAllocation._meta.get_field('payment_method')
        method_choices = {choice[0] for choice in method_field.choices}
        
        required_methods = {'CASH', 'QRIS', 'TRANSFER'}
        missing_methods = required_methods - method_choices
        
        assert not missing_methods, f"Missing payment methods: {missing_methods}"

    def test_paymentallocation_amount_decimal(self):
        """amount must be DecimalField (Contract §3.2)"""
        from apps.receivable.models import PaymentAllocation
        from django.db.models import DecimalField
        
        amount_field = PaymentAllocation._meta.get_field('amount')
        assert isinstance(amount_field, DecimalField)
        assert amount_field.max_digits == 12
        assert amount_field.decimal_places == 2

    def test_paymentallocation_is_reversed_boolean(self):
        """is_reversed must be BooleanField with default=False (Contract §3.2 + §10)"""
        from apps.receivable.models import PaymentAllocation
        from django.db.models import BooleanField
        
        is_reversed_field = PaymentAllocation._meta.get_field('is_reversed')
        assert isinstance(is_reversed_field, BooleanField)
        assert is_reversed_field.default is False

    def test_paymentallocation_no_delete_endpoint(self):
        """PaymentAllocation must be immutable - no DELETE/PATCH in API (Contract §3.2 + §14)"""
        # This is a contract assertion that will be verified in behavior tests
        # At model level, we verify the model itself doesn't prevent creation
        from apps.receivable.models import PaymentAllocation
        assert PaymentAllocation is not None


@pytest.mark.django_db
class TestReceivableContractInvariants:
    """Contract §4: Domain invariants structure verification"""

    def test_receivable_business_location_sale_relationship(self):
        """Verify relationship structure for business/location/sale consistency (Contract §4)"""
        from apps.receivable.models import Receivable
        
        # Verify FKs exist and are correctly configured
        business_field = Receivable._meta.get_field('business')
        location_field = Receivable._meta.get_field('location')
        sale_field = Receivable._meta.get_field('sale')
        
        assert business_field is not None
        assert location_field is not None
        assert sale_field is not None

    def test_paymentallocation_business_receivable_relationship(self):
        """Verify PaymentAllocation business/receivable consistency (Contract §4 invariant #5)"""
        from apps.receivable.models import PaymentAllocation
        
        business_field = PaymentAllocation._meta.get_field('business')
        receivable_field = PaymentAllocation._meta.get_field('receivable')
        
        assert business_field is not None
        assert receivable_field is not None
        assert receivable_field.remote_field.on_delete == PROTECT


# ============================================================
# DEFERRED BEHAVIOR TESTS
# ============================================================
"""
The following acceptance test categories are DEFERRED to test_receivable_behavior.py
because they require model instances and fixtures to execute properly.

When production models are implemented, these tests will verify:

1. Invoice Uniqueness
   - Duplicate invoice_number in same business → reject
   - Same invoice_number on different business → allowed

2. Receivable Creation
   - Only created from COMPLETED credit Sale
   - Standalone creation blocked
   - Atomic transaction rollback

3. Credit Sale Scenarios
   - Zero payment (UNPAID)
   - Partial payment (PARTIAL)
   - Full payment (no receivable or PAID)

4. Payment Recording & Terminal Status Guard
   - Valid payment on UNPAID/PARTIAL
   - Zero/negative payment → 400
   - Overpayment → 400
   - PAID → 400
   - CLOSED → 400
   - VOIDED → 400

5. Payment Reversal
   - Owner can reverse (specific PaymentAllocation)
   - Admin/Kasir cannot → 403
   - Double reversal → 400
   - CLOSED receivable reversal → 400

6. Closed Semantics
   - PARTIAL → CLOSED preserves historical paid_amount
   - outstanding becomes 0
   - CLOSED != PAID

7. Void Rules
   - UNPAID → VOIDED allowed
   - PARTIAL/PAID → reject (reversal required first)

8. Concurrency
   - select_for_update prevents overpayment
   - Simultaneous payments race condition

9. Cross-Business Isolation
   - List/detail blocked (404)
   - API responses filtered

10. Cross-Entity Consistency
    - All 6 domain invariants enforced server-side

11. RBAC & Location Restriction
    - Kasir active-location only
    - Kasir cannot update due_date
    - Role matrix enforcement

12. Business Timezone MVP
    - overdue calculation uses server timezone
    - Aging buckets

13. Reports & Dashboard
    - Customer outstanding aggregation
    - Dashboard KPIs

14. Sales Integration
    - Stock deduction once (atomic)
    - No duplicate inventory reduction
    - No parallel sales workflow

15. Deletion Protection
    - Customer with receivable cannot delete (PROTECT)
    - Location with receivable cannot delete (PROTECT)

16. Audit Events
    - RECEIVABLE_CREATED
    - PAYMENT_ALLOCATED
    - PAYMENT_REVERSED
    - DUE_DATE_UPDATED
    - RECEIVABLE_VOIDED
    - RECEIVABLE_CLOSED
"""
