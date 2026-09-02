from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from apps.business.models import Location
from apps.payable.models import Payable, SupplierPaymentAllocation
from apps.purchasing.models import PurchaseOrder, PurchaseOrderLine
from apps.supplier.models import Supplier
from apps.audit.services import record_audit_event


class SupplierPaymentAllocationSerializer(serializers.ModelSerializer):
    created_by = serializers.UUIDField(source="created_by.id", read_only=True, allow_null=True)
    reversed_by = serializers.UUIDField(source="reversed_by.id", read_only=True, allow_null=True)

    class Meta:
        model = SupplierPaymentAllocation
        fields = [
            "id",
            "business",
            "payable",
            "amount",
            "payment_method",
            "payment_date",
            "reference",
            "notes",
            "is_reversed",
            "reversed_at",
            "reversed_by",
            "reversal_reason",
            "created_by",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "payable",
            "amount",
            "payment_method",
            "payment_date",
            "reference",
            "notes",
            "is_reversed",
            "reversed_at",
            "reversed_by",
            "reversal_reason",
            "created_by",
            "created_at",
        ]


class PayableSerializer(serializers.ModelSerializer):
    business = serializers.UUIDField(source="business.id", read_only=True)
    location = serializers.UUIDField(source="location.id", read_only=True)
    supplier = serializers.UUIDField(source="supplier.id", read_only=True)
    purchase_order = serializers.UUIDField(source="purchase_order.id", read_only=True)
    allocations = SupplierPaymentAllocationSerializer(many=True, read_only=True)
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Payable
        fields = [
            "id",
            "business",
            "location",
            "supplier",
            "purchase_order",
            "invoice_number",
            "original_amount",
            "paid_amount",
            "outstanding_amount",
            "status",
            "due_date",
            "is_overdue",
            "notes",
            "allocations",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "location",
            "supplier",
            "purchase_order",
            "invoice_number",
            "original_amount",
            "paid_amount",
            "outstanding_amount",
            "status",
            "is_overdue",
            "allocations",
            "created_at",
            "updated_at",
        ]

    def get_is_overdue(self, obj):
        business_today = timezone.localdate()
        return bool(
            obj.due_date
            and obj.due_date < business_today
            and obj.outstanding_amount > 0
            and obj.status in [Payable.Status.UNPAID, Payable.Status.PARTIAL]
        )


class PayableUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payable
        fields = ["due_date", "notes"]

    def update(self, instance, validated_data):
        old_due_date = instance.due_date
        new_due_date = validated_data.get("due_date", old_due_date)

        with transaction.atomic():
            instance = super().update(instance, validated_data)
            request = self.context.get("request")
            actor = request.user if request else None

            if new_due_date != old_due_date:
                record_audit_event(
                    actor=actor,
                    action="DUE_DATE_UPDATED",
                    business=instance.business,
                    location=instance.location,
                    target=str(instance.id),
                    resource="Payable",
                    event_type="DUE_DATE_UPDATED",
                    outcome="SUCCESS",
                )
        return instance


class PayableCreateSerializer(serializers.Serializer):
    purchase_order = serializers.UUIDField()
    location = serializers.UUIDField()
    initial_payment = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    payment_method = serializers.ChoiceField(
        choices=SupplierPaymentAllocation.PaymentMethod.choices,
        default=SupplierPaymentAllocation.PaymentMethod.CASH,
    )
    due_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    invoice_number = serializers.CharField(required=False, allow_blank=True)

    def validate_purchase_order(self, value):
        business = self.context.get("business")
        po = PurchaseOrder.objects.filter(business=business, pk=value).first()
        if po is None:
            raise ValidationError("PurchaseOrder does not belong to this business.")
        if po.status != PurchaseOrder.Status.CONFIRMED:
            raise ValidationError(
                f"PurchaseOrder must be CONFIRMED to create a payable. Current status: {po.status}."
            )
        if hasattr(po, 'payable'):
            raise ValidationError("A payable already exists for this PurchaseOrder.")
        return po

    def validate_location(self, value):
        business = self.context.get("business")
        location = Location.objects.filter(business=business, pk=value).first()
        if location is None:
            raise ValidationError("Location does not belong to this business.")
        return location

    def validate(self, attrs):
        business = self.context.get("business")
        po = attrs["purchase_order"]
        location = attrs["location"]
        initial_payment = attrs.get("initial_payment", Decimal("0.00"))

        if initial_payment < 0:
            raise ValidationError({"initial_payment": "Initial payment cannot be negative."})

        # Validate location matches PO location
        if str(location.pk) != str(po.location_id):
            raise ValidationError({"location": "Location must match the PurchaseOrder location."})

        # Calculate original_amount from PO lines
        po_lines = PurchaseOrderLine.objects.filter(purchase_order=po)
        total_amount = sum(
            line.quantity * line.unit_price for line in po_lines
        )
        if total_amount <= 0:
            raise ValidationError({"purchase_order": "PurchaseOrder total amount must be greater than zero."})

        if initial_payment > total_amount:
            raise ValidationError({"initial_payment": "Initial payment cannot exceed total payable amount (overpayment)."})

        attrs["_total_amount"] = total_amount
        attrs["_supplier"] = po.supplier
        return attrs

    def create(self, validated_data):
        business = self.context.get("business")
        request = self.context.get("request")
        actor = request.user if request else None

        po = validated_data["purchase_order"]
        location = validated_data["location"]
        supplier = validated_data["_supplier"]
        initial_payment = validated_data.get("initial_payment", Decimal("0.00"))
        payment_method = validated_data.get("payment_method", SupplierPaymentAllocation.PaymentMethod.CASH)
        due_date = validated_data.get("due_date")
        notes = validated_data.get("notes", "")
        invoice_number = validated_data.get("invoice_number", "").strip()
        total_amount = validated_data["_total_amount"]

        if not invoice_number:
            import uuid as uuid_mod
            invoice_number = f"INV-PO-{uuid_mod.uuid4().hex[:8].upper()}"

        with transaction.atomic():
            # Determine initial status and paid amount
            paid_amount = initial_payment if initial_payment > 0 else Decimal("0.00")
            outstanding_amount = total_amount - paid_amount
            if paid_amount == 0:
                payable_status = Payable.Status.UNPAID
            elif outstanding_amount == 0:
                payable_status = Payable.Status.PAID
            else:
                payable_status = Payable.Status.PARTIAL

            # Create Payable
            payable = Payable.objects.create(
                business=business,
                location=location,
                supplier=supplier,
                purchase_order=po,
                invoice_number=invoice_number,
                original_amount=total_amount,
                paid_amount=paid_amount,
                outstanding_amount=outstanding_amount,
                status=payable_status,
                due_date=due_date,
                notes=notes,
            )

            # Create initial SupplierPaymentAllocation if DP > 0
            if paid_amount > 0:
                SupplierPaymentAllocation.objects.create(
                    business=business,
                    payable=payable,
                    amount=paid_amount,
                    payment_method=payment_method,
                    reference="Initial payment (DP)",
                    notes="Initial payment (DP)",
                    created_by=actor,
                )

            # Audit log
            record_audit_event(
                actor=actor,
                action="PAYABLE_CREATED",
                business=business,
                location=location,
                target=str(payable.id),
                resource="Payable",
                event_type="PAYABLE_CREATED",
                outcome="SUCCESS",
            )
            if paid_amount > 0:
                record_audit_event(
                    actor=actor,
                    action="SUPPLIER_PAYMENT_ALLOCATED",
                    business=business,
                    location=location,
                    target=str(payable.id),
                    resource="SupplierPaymentAllocation",
                    event_type="SUPPLIER_PAYMENT_ALLOCATED",
                    outcome="SUCCESS",
                )

        return payable


class SupplierPaymentCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_method = serializers.ChoiceField(choices=SupplierPaymentAllocation.PaymentMethod.choices)
    reference = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_amount(self, value):
        if value <= 0:
            raise ValidationError("Payment amount must be greater than zero.")
        return value


class SupplierPaymentReverseSerializer(serializers.Serializer):
    reversal_reason = serializers.CharField()

    def validate_reversal_reason(self, value):
        if not value or not value.strip():
            raise ValidationError("Reversal reason is required.")
        return value.strip()


class PayableCloseSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)
