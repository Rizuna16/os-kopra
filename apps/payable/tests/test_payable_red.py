"""
GAP-03 HUTANG — RED PHASE: MODEL FOUNDATION & SCHEMA CONTRACT
Contract Source: GAP-03-HUTANG-CONTRACT-LOCK.md
Status: RED — Model Foundation Tests

This suite verifies the structural contract of Payable and SupplierPaymentAllocation models.
All tests are expected to FAIL in RED phase (models don't exist yet in apps.payable.models).
"""
import pytest
from django.db.models import CASCADE, PROTECT, OneToOneField, DecimalField, CharField, DateField, TextField, BooleanField


@pytest.mark.django_db
class TestPayableModelFoundation:
    """Contract §3.1: Payable model schema and relationships"""

    def test_payable_model_exists(self):
        """Payable model must be importable from apps.payable.models"""
        from apps.payable.models import Payable
        assert Payable is not None

    def test_payable_has_id_uuid_primary_key(self):
        """Payable must have UUID primary key"""
        from apps.payable.models import Payable
        id_field = Payable._meta.get_field('id')
        assert id_field.primary_key is True
        assert 'UUID' in str(id_field.__class__.__name__)

    def test_payable_has_required_fields(self):
        """Payable must have all contract-defined fields (Contract §3.1)"""
        from apps.payable.models import Payable

        field_names = {f.name for f in Payable._meta.get_fields()}

        required_fields = {
            'id', 'business', 'location', 'supplier', 'purchase_order',
            'invoice_number', 'original_amount', 'paid_amount',
            'outstanding_amount', 'status', 'due_date', 'notes',
            'created_at', 'updated_at'
        }

        missing = required_fields - field_names
        assert not missing, f"Missing required fields: {missing}"

    def test_payable_status_choices_complete(self):
        """Payable status must include all 5 contract choices (Contract §5)"""
        from apps.payable.models import Payable

        status_field = Payable._meta.get_field('status')
        status_choices = {choice[0] for choice in status_field.choices}

        required_statuses = {'UNPAID', 'PARTIAL', 'PAID', 'VOIDED', 'CLOSED'}
        missing_statuses = required_statuses - status_choices

        assert not missing_statuses, f"Missing status choices: {missing_statuses}"

    def test_payable_business_fk_cascade(self):
        """business FK must use CASCADE (Contract §3.1)"""
        from apps.payable.models import Payable

        business_field = Payable._meta.get_field('business')
        assert business_field.remote_field.on_delete == CASCADE

    def test_payable_location_fk_protect(self):
        """location FK must use PROTECT for historical data retention (Contract §3.1)"""
        from apps.payable.models import Payable

        location_field = Payable._meta.get_field('location')
        assert location_field.remote_field.on_delete == PROTECT

    def test_payable_supplier_fk_protect(self):
        """supplier FK must use PROTECT to prevent data loss (Contract §3.1)"""
        from apps.payable.models import Payable

        supplier_field = Payable._meta.get_field('supplier')
        assert supplier_field.remote_field.on_delete == PROTECT

    def test_payable_purchase_order_onetoone_protect(self):
        """purchase_order must be OneToOne with PROTECT (Contract §3.1)"""
        from apps.payable.models import Payable

        po_field = Payable._meta.get_field('purchase_order')
        assert isinstance(po_field, OneToOneField), f"purchase_order field is {type(po_field)}, not OneToOneField"
        assert po_field.remote_field.on_delete == PROTECT

    def test_payable_original_amount_decimal(self):
        """original_amount must be DecimalField (Contract §3.1)"""
        from apps.payable.models import Payable

        original_amount_field = Payable._meta.get_field('original_amount')
        assert isinstance(original_amount_field, DecimalField)
        assert original_amount_field.max_digits == 12
        assert original_amount_field.decimal_places == 2

    def test_payable_paid_amount_decimal(self):
        """paid_amount must be DecimalField with default=0 (Contract §3.1)"""
        from apps.payable.models import Payable

        paid_amount_field = Payable._meta.get_field('paid_amount')
        assert isinstance(paid_amount_field, DecimalField)
        assert paid_amount_field.max_digits == 12
        assert paid_amount_field.decimal_places == 2
        assert paid_amount_field.default == 0

    def test_payable_outstanding_amount_decimal(self):
        """outstanding_amount must be DecimalField (Contract §3.1 + §5)"""
        from apps.payable.models import Payable

        outstanding_field = Payable._meta.get_field('outstanding_amount')
        assert isinstance(outstanding_field, DecimalField)
        assert outstanding_field.max_digits == 12
        assert outstanding_field.decimal_places == 2

    def test_payable_invoice_number_field(self):
        """invoice_number must be CharField (Contract §3.1)"""
        from apps.payable.models import Payable

        invoice_field = Payable._meta.get_field('invoice_number')
        assert isinstance(invoice_field, CharField)
        assert invoice_field.max_length == 100

    def test_payable_due_date_optional(self):
        """due_date must be nullable DateField (Contract §3.1)"""
        from apps.payable.models import Payable

        due_date_field = Payable._meta.get_field('due_date')
        assert isinstance(due_date_field, DateField)
        assert due_date_field.null is True
        assert due_date_field.blank is True

    def test_payable_notes_optional(self):
        """notes must be TextField (Contract §3.1)"""
        from apps.payable.models import Payable

        notes_field = Payable._meta.get_field('notes')
        assert isinstance(notes_field, TextField)
        assert notes_field.blank is True


@pytest.mark.django_db
class TestSupplierPaymentAllocationModelFoundation:
    """Contract §3.2: SupplierPaymentAllocation model schema and relationships"""

    def test_supplierpaymentallocation_model_exists(self):
        """SupplierPaymentAllocation model must be importable"""
        from apps.payable.models import SupplierPaymentAllocation
        assert SupplierPaymentAllocation is not None

    def test_supplierpaymentallocation_has_id_uuid_primary_key(self):
        """SupplierPaymentAllocation must have UUID primary key"""
        from apps.payable.models import SupplierPaymentAllocation

        id_field = SupplierPaymentAllocation._meta.get_field('id')
        assert id_field.primary_key is True
        assert 'UUID' in str(id_field.__class__.__name__)

    def test_supplierpaymentallocation_has_required_fields(self):
        """SupplierPaymentAllocation must have all contract-defined fields (Contract §3.2)"""
        from apps.payable.models import SupplierPaymentAllocation

        field_names = {f.name for f in SupplierPaymentAllocation._meta.get_fields()}

        required_fields = {
            'id', 'business', 'payable', 'amount', 'payment_method',
            'payment_date', 'reference', 'notes', 'is_reversed',
            'reversed_at', 'reversed_by', 'reversal_reason',
            'created_by', 'created_at'
        }

        missing = required_fields - field_names
        assert not missing, f"Missing required fields: {missing}"

    def test_supplierpaymentallocation_business_fk_cascade(self):
        """business FK must use CASCADE (Contract §3.2)"""
        from apps.payable.models import SupplierPaymentAllocation

        business_field = SupplierPaymentAllocation._meta.get_field('business')
        assert business_field.remote_field.on_delete == CASCADE

    def test_supplierpaymentallocation_payable_fk_protect(self):
        """payable FK must use PROTECT for data retention (Contract §3.2)"""
        from apps.payable.models import SupplierPaymentAllocation

        payable_field = SupplierPaymentAllocation._meta.get_field('payable')
        assert payable_field.remote_field.on_delete == PROTECT

    def test_supplierpaymentallocation_payment_method_choices(self):
        """payment_method must include CASH, QRIS, TRANSFER (Contract §3.2)"""
        from apps.payable.models import SupplierPaymentAllocation

        method_field = SupplierPaymentAllocation._meta.get_field('payment_method')
        method_choices = {choice[0] for choice in method_field.choices}

        required_methods = {'CASH', 'QRIS', 'TRANSFER'}
        missing_methods = required_methods - method_choices

        assert not missing_methods, f"Missing payment methods: {missing_methods}"

    def test_supplierpaymentallocation_amount_decimal(self):
        """amount must be DecimalField (Contract §3.2)"""
        from apps.payable.models import SupplierPaymentAllocation

        amount_field = SupplierPaymentAllocation._meta.get_field('amount')
        assert isinstance(amount_field, DecimalField)
        assert amount_field.max_digits == 12
        assert amount_field.decimal_places == 2

    def test_supplierpaymentallocation_is_reversed_boolean(self):
        """is_reversed must be BooleanField with default=False (Contract §3.2)"""
        from apps.payable.models import SupplierPaymentAllocation

        is_reversed_field = SupplierPaymentAllocation._meta.get_field('is_reversed')
        assert isinstance(is_reversed_field, BooleanField)
        assert is_reversed_field.default is False
