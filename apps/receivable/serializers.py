from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from apps.business.models import Location
from apps.customer.models import Customer
from apps.inventory.models import Stock
from apps.product.models import Variant
from apps.sales.models import Sale, SaleLine
from apps.sales.serializers import (
    SaleLineCreateSerializer,
    _reduce_stock_for_sale,
    _snapshot_promotions_for_sale,
    _resolve_and_link_shift,
)
from apps.receivable.models import Receivable, PaymentAllocation
from apps.audit.services import record_audit_event


class PaymentAllocationSerializer(serializers.ModelSerializer):
    created_by = serializers.UUIDField(source="created_by.id", read_only=True, allow_null=True)
    reversed_by = serializers.UUIDField(source="reversed_by.id", read_only=True, allow_null=True)

    class Meta:
        model = PaymentAllocation
        fields = [
            "id",
            "business",
            "receivable",
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
            "receivable",
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


class ReceivableSerializer(serializers.ModelSerializer):
    business = serializers.UUIDField(source="business.id", read_only=True)
    location = serializers.UUIDField(source="location.id", read_only=True)
    customer = serializers.UUIDField(source="customer.id", read_only=True)
    sale = serializers.UUIDField(source="sale.id", read_only=True)
    allocations = PaymentAllocationSerializer(many=True, read_only=True)
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Receivable
        fields = [
            "id",
            "business",
            "location",
            "customer",
            "sale",
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
            "customer",
            "sale",
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
            and obj.status in [Receivable.Status.UNPAID, Receivable.Status.PARTIAL]
        )


class ReceivableUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receivable
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
                    resource="Receivable",
                    event_type="DUE_DATE_UPDATED",
                    outcome="SUCCESS",
                )
        return instance


class CreditSaleCreateSerializer(serializers.Serializer):
    location = serializers.UUIDField()
    customer = serializers.UUIDField()
    lines = SaleLineCreateSerializer(many=True)
    initial_payment = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    payment_method = serializers.ChoiceField(
        choices=PaymentAllocation.PaymentMethod.choices, default=PaymentAllocation.PaymentMethod.CASH
    )
    due_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    reference = serializers.CharField(required=False, allow_blank=True)
    invoice_number = serializers.CharField(required=False, allow_blank=True)

    def validate_location(self, value):
        business = self.context.get("business")
        location = Location.objects.filter(business=business, pk=value).first()
        if location is None:
            raise ValidationError("Location does not belong to this business.")
        return location

    def validate_customer(self, value):
        business = self.context.get("business")
        customer = Customer.objects.filter(business=business, pk=value).first()
        if customer is None:
            raise ValidationError("Customer does not belong to this business.")
        return customer

    def validate(self, attrs):
        business = self.context.get("business")
        initial_payment = attrs.get("initial_payment", Decimal("0.00"))
        if initial_payment < 0:
            raise ValidationError({"initial_payment": "Initial payment cannot be negative."})

        # Calculate total sale amount from lines
        lines_data = attrs.get("lines", [])
        if not lines_data:
            raise ValidationError({"lines": "At least one sale line is required for credit sale."})

        total_amount = sum(
            Decimal(str(line["quantity"])) * Decimal(str(line["unit_price"]))
            for line in lines_data
        )

        if initial_payment > total_amount:
            raise ValidationError({"initial_payment": "Initial payment cannot exceed total sale amount (overpayment)."})

        attrs["_total_amount"] = total_amount
        return attrs

    def create(self, validated_data):
        business = self.context.get("business")
        request = self.context.get("request")
        actor = request.user if request else None

        location = validated_data["location"]
        customer = validated_data["customer"]
        lines_data = validated_data["lines"]
        initial_payment = validated_data.get("initial_payment", Decimal("0.00"))
        payment_method = validated_data.get("payment_method", PaymentAllocation.PaymentMethod.CASH)
        due_date = validated_data.get("due_date")
        notes = validated_data.get("notes", "")
        reference = validated_data.get("reference", "")
        invoice_number = validated_data.get("invoice_number", "").strip()
        total_amount = validated_data["_total_amount"]

        if not invoice_number:
            import uuid
            invoice_number = f"INV-{uuid.uuid4().hex[:8].upper()}"

        with transaction.atomic():
            # 1. Create Sale (status=COMPLETED)
            sale = Sale.objects.create(
                business=business,
                location=location,
                customer=customer,
                status=Sale.Status.COMPLETED,
                payment_method=Sale.PaymentMethod.CASH,  # channel
                shift=_resolve_and_link_shift(actor, business, location),
            )

            # 2. Create SaleLines
            for line in lines_data:
                promotion = line.get("applied_promotion")
                line_kwargs = {
                    "sale": sale,
                    "variant": line["variant"],
                    "quantity": line["quantity"],
                    "unit_price": line["unit_price"],
                    "applied_cost_price": getattr(line["variant"], "cost_price", Decimal("0.00")),
                }
                if promotion is not None:
                    line_kwargs["applied_promotion"] = promotion
                SaleLine.objects.create(**line_kwargs)

            # 3. Snapshot promotions and reduce stock exactly once
            _snapshot_promotions_for_sale(sale)
            _reduce_stock_for_sale(sale)

            # 4. Determine initial receivable status & paid amount
            paid_amount = initial_payment if initial_payment > 0 else Decimal("0.00")
            outstanding_amount = total_amount - paid_amount
            if paid_amount == 0:
                receivable_status = Receivable.Status.UNPAID
            elif outstanding_amount == 0:
                receivable_status = Receivable.Status.PAID
            else:
                receivable_status = Receivable.Status.PARTIAL

            # 5. Create Receivable
            receivable = Receivable.objects.create(
                business=business,
                location=location,
                customer=customer,
                sale=sale,
                invoice_number=invoice_number,
                original_amount=total_amount,
                paid_amount=paid_amount,
                outstanding_amount=outstanding_amount,
                status=receivable_status,
                due_date=due_date,
                notes=notes,
            )

            # 6. Create initial PaymentAllocation if DP > 0
            if paid_amount > 0:
                PaymentAllocation.objects.create(
                    business=business,
                    receivable=receivable,
                    amount=paid_amount,
                    payment_method=payment_method,
                    reference=reference,
                    notes="Initial payment (DP)",
                    created_by=actor,
                )

            # 7. Audit log
            record_audit_event(
                actor=actor,
                action="RECEIVABLE_CREATED",
                business=business,
                location=location,
                target=str(receivable.id),
                resource="Receivable",
                event_type="RECEIVABLE_CREATED",
                outcome="SUCCESS",
            )
            if paid_amount > 0:
                record_audit_event(
                    actor=actor,
                    action="PAYMENT_ALLOCATED",
                    business=business,
                    location=location,
                    target=str(receivable.id),
                    resource="PaymentAllocation",
                    event_type="PAYMENT_ALLOCATED",
                    outcome="SUCCESS",
                )

        return receivable


class PaymentCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_method = serializers.ChoiceField(choices=PaymentAllocation.PaymentMethod.choices)
    reference = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_amount(self, value):
        if value <= 0:
            raise ValidationError("Payment amount must be greater than zero.")
        return value


class PaymentReverseSerializer(serializers.Serializer):
    reversal_reason = serializers.CharField()

    def validate_reversal_reason(self, value):
        if not value or not value.strip():
            raise ValidationError("Reversal reason is required.")
        return value.strip()


class ReceivableCloseSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)
