from decimal import Decimal

from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from apps.business.models import Location
from apps.customer.models import Customer
from apps.inventory.models import Stock
from apps.product.models import Variant
from apps.promotion_loyalty.models import Promotion
from apps.sales.models import Sale, SaleLine, CashierShift


def _reduce_stock_for_sale(sale):
    for line in sale.lines.all():
        stock, _ = Stock.objects.select_for_update().get_or_create(
            location=sale.location,
            variant=line.variant,
            defaults={"quantity": Decimal("0")},
        )
        stock.quantity -= line.quantity
        stock.save()


class CashierShiftSerializer(serializers.ModelSerializer):
    business = serializers.UUIDField(source="business.id", read_only=True)
    location = serializers.UUIDField(source="location.id", read_only=True)
    cashier = serializers.UUIDField(source="cashier.id", read_only=True)

    class Meta:
        model = CashierShift
        fields = [
            "id",
            "business",
            "location",
            "cashier",
            "modal_awal",
            "uang_tunai_aktual",
            "selisih_kas",
            "status",
            "opened_at",
            "closed_at",
        ]


class CashierShiftCreateSerializer(serializers.ModelSerializer):
    location = serializers.UUIDField()

    class Meta:
        model = CashierShift
        fields = ["location", "modal_awal"]

    def validate_location(self, value):
        business = self.context.get("business")
        location = Location.objects.filter(business=business, pk=value).first()
        if location is None:
            raise serializers.ValidationError(
                "Location does not belong to this business."
            )
        return location

    def validate(self, attrs):
        business = self.context.get("business")
        request = self.context.get("request")
        user = request.user
        location = attrs.get("location")

        active_shift = CashierShift.objects.filter(
            business=business,
            location=location,
            cashier=user,
            status=CashierShift.Status.OPEN
        ).exists()
        if active_shift:
            raise serializers.ValidationError(
                "This cashier already has an active shift at this location."
            )
        return attrs

    def create(self, validated_data):
        business = self.context.get("business")
        request = self.context.get("request")
        validated_data["business"] = business
        validated_data["cashier"] = request.user
        validated_data["status"] = CashierShift.Status.OPEN
        return super().create(validated_data)


class CashierShiftCloseSerializer(serializers.Serializer):
    uang_tunai_aktual = serializers.DecimalField(max_digits=12, decimal_places=2)

    def validate_uang_tunai_aktual(self, value):
        if value < 0:
            raise serializers.ValidationError("Actual cash must not be negative.")
        return value


# HELD is a Kasir-only operational state. It is intentionally excluded from the
# canonical Sale.Status model choices so the shared Sale model stays compatible
# with locked Part 12 / Part 22 contracts. We expose it at the serializer layer
# for authorized business staff (OWNER / ADMIN / KASIR) only.
SALE_STATUS_CHOICES_WITH_HELD = list(Sale.Status.choices) + [
    (Sale.HELD_STATUS, "Held")
]


class SaleLineSerializer(serializers.ModelSerializer):
    variant = serializers.UUIDField(source="variant.id", read_only=True)
    applied_promotion = serializers.UUIDField(
        source="applied_promotion.id", read_only=True, allow_null=True
    )

    class Meta:
        model = SaleLine
        fields = [
            "id",
            "variant",
            "quantity",
            "unit_price",
            "applied_promotion",
            "applied_discount_type",
            "applied_discount_value",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "variant",
            "applied_promotion",
            "applied_discount_type",
            "applied_discount_value",
            "created_at",
            "updated_at",
        ]


class SaleSerializer(serializers.ModelSerializer):
    business = serializers.UUIDField(source="business.id", read_only=True)
    location = serializers.UUIDField(source="location.id", read_only=True)
    customer = serializers.UUIDField(
        source="customer.id", read_only=True, allow_null=True
    )
    lines = SaleLineSerializer(many=True, read_only=True)
    shift = serializers.UUIDField(source="shift.id", read_only=True, allow_null=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "business",
            "location",
            "customer",
            "loyalty_earned",
            "status",
            "payment_method",
            "shift",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "location",
            "customer",
            "loyalty_earned",
            "shift",
            "lines",
            "created_at",
            "updated_at",
        ]


class SaleLineCreateSerializer(serializers.Serializer):
    variant = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    applied_promotion = serializers.UUIDField(required=False, allow_null=True)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value

    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Unit price must not be negative.")
        return value

    def validate_variant(self, value):
        business = self.context.get("business")
        if business is None:
            raise serializers.ValidationError("Business context is required.")
        variant = Variant.objects.filter(product__business=business, pk=value).first()
        if variant is None:
            raise serializers.ValidationError(
                "Variant does not belong to this business."
            )
        return variant

    def validate_applied_promotion(self, value):
        if value is None:
            return None
        business = self.context.get("business")
        promotion = Promotion.objects.filter(business=business, pk=value).first()
        if promotion is None:
            raise serializers.ValidationError(
                "Promotion does not belong to this business."
            )
        return promotion


def _resolve_and_link_shift(user, business, location):
    if not user or user.is_anonymous:
        return None

    return CashierShift.objects.filter(
        business=business,
        location=location,
        cashier=user,
        status=CashierShift.Status.OPEN
    ).first()


def _is_held_status(status_value):
    return status_value == Sale.HELD_STATUS


class SaleCreateSerializer(serializers.Serializer):
    location = serializers.UUIDField()
    customer = serializers.UUIDField(required=False, allow_null=True)
    status = serializers.ChoiceField(
        choices=SALE_STATUS_CHOICES_WITH_HELD, default=Sale.Status.DRAFT
    )
    payment_method = serializers.ChoiceField(
        choices=Sale.PaymentMethod.choices, required=False, allow_null=True
    )
    lines = SaleLineCreateSerializer(many=True, required=False)

    def validate_location(self, value):
        business = self.context.get("business")
        location = Location.objects.filter(business=business, pk=value).first()
        if location is None:
            raise serializers.ValidationError(
                "Location does not belong to this business."
            )
        return location

    def validate_customer(self, value):
        if value is None:
            return None
        business = self.context.get("business")
        customer = Customer.objects.filter(business=business, pk=value).first()
        if customer is None:
            raise serializers.ValidationError(
                "Customer does not belong to this business."
            )
        return customer

    def validate(self, attrs):
        business = self.context.get("business")
        request = self.context.get("request")
        user = request.user if request else None

        status_value = attrs.get("status", Sale.Status.DRAFT)
        payment_method = attrs.get("payment_method")
        location = attrs.get("location")

        if user and not user.is_anonymous:
            from apps.authentication.permissions import resolve_business_role
            role = resolve_business_role(user, business)

            # HELD restriction: only allowed for business roles
            if _is_held_status(status_value) and role not in ["OWNER", "ADMIN", "KASIR"]:
                raise serializers.ValidationError(
                    {"status": "HELD status is only allowed for business staff transactions."}
                )

            if role == "KASIR":
                # Ensure active shift exists
                shift = CashierShift.objects.filter(
                    business=business,
                    location=location,
                    cashier=user,
                    status=CashierShift.Status.OPEN
                ).first()
                if not shift:
                    raise serializers.ValidationError(
                        {"non_field_errors": ["Active cashier shift is required for cashier transactions."]}
                    )
                if status_value == Sale.Status.COMPLETED:
                    if not payment_method:
                        raise serializers.ValidationError(
                            {"payment_method": "Payment method is required for completed cashier transactions."}
                        )
        else:
            # Anonymous / Online Store
            if _is_held_status(status_value):
                raise serializers.ValidationError(
                    {"status": "HELD status is not allowed for this channel."}
                )
        return attrs

    def create(self, validated_data):
        business = self.context.get("business")
        location = validated_data["location"]
        customer = validated_data.get("customer")
        status_value = validated_data.get("status", Sale.Status.DRAFT)
        payment_method = validated_data.get("payment_method")
        lines_data = validated_data.get("lines", [])
        request = self.context.get("request")

        with transaction.atomic():
            sale = Sale.objects.create(
                business=business,
                location=location,
                customer=customer,
                status=status_value,
                payment_method=payment_method,
                shift=_resolve_and_link_shift(request.user if request else None, business, location),
            )
            for line in lines_data:
                promotion = line.get("applied_promotion")
                line_kwargs = {
                    "sale": sale,
                    "variant": line["variant"],
                    "quantity": line["quantity"],
                    "unit_price": line["unit_price"],
                }
                if promotion is not None:
                    line_kwargs["applied_promotion"] = promotion
                SaleLine.objects.create(**line_kwargs)
            if status_value == Sale.Status.COMPLETED:
                _snapshot_promotions_for_sale(sale)
                _reduce_stock_for_sale(sale)
        return sale


def _snapshot_promotions_for_sale(sale):
    """Copy current Promotion discount values into SaleLine at COMPLETED."""
    for line in sale.lines.all():
        promotion = line.applied_promotion
        if promotion is None:
            continue
        if promotion.business_id != sale.business_id:
            raise serializers.ValidationError(
                {"applied_promotion": "Promotion does not belong to this business."}
            )
        line.applied_discount_type = promotion.discount_type
        line.applied_discount_value = promotion.discount_value
        line.save(
            update_fields=["applied_discount_type", "applied_discount_value"]
        )


class SaleUpdateSerializer(serializers.Serializer):
    location = serializers.UUIDField(required=False)
    customer = serializers.UUIDField(required=False, allow_null=True)
    status = serializers.ChoiceField(
        choices=SALE_STATUS_CHOICES_WITH_HELD, required=False
    )
    payment_method = serializers.ChoiceField(
        choices=Sale.PaymentMethod.choices, required=False, allow_null=True
    )
    lines = SaleLineCreateSerializer(many=True, required=False)

    def validate_location(self, value):
        business = self.context.get("business")
        location = Location.objects.filter(business=business, pk=value).first()
        if location is None:
            raise serializers.ValidationError(
                "Location does not belong to this business."
            )
        return location

    def validate_customer(self, value):
        if value is None:
            return None
        business = self.context.get("business")
        customer = Customer.objects.filter(business=business, pk=value).first()
        if customer is None:
            raise serializers.ValidationError(
                "Customer does not belong to this business."
            )
        return customer

    def validate(self, attrs):
        instance = self.instance
        business = instance.business
        request = self.context.get("request")
        user = request.user if request else None

        status_value = attrs.get("status", instance.status)
        payment_method = attrs.get("payment_method", instance.payment_method)
        location = attrs.get("location", instance.location)

        if user and not user.is_anonymous:
            from apps.authentication.permissions import resolve_business_role
            role = resolve_business_role(user, business)

            # HELD restriction: only allowed for business roles
            if _is_held_status(status_value) and role not in ["OWNER", "ADMIN", "KASIR"]:
                raise serializers.ValidationError(
                    {"status": "HELD status is only allowed for business staff transactions."}
                )

            # Cashier shift requirements
            if role == "KASIR":
                shift = CashierShift.objects.filter(
                    business=business,
                    location=location,
                    cashier=user,
                    status=CashierShift.Status.OPEN
                ).first()
                if not shift:
                    raise serializers.ValidationError(
                        {"non_field_errors": ["Active cashier shift is required for cashier transactions."]}
                    )

                # Check HELD ownership / resume security
                if instance.status == Sale.HELD_STATUS:
                    if instance.shift and instance.shift.cashier != user:
                        raise PermissionDenied("You do not have permission to resume this cashier transaction.")

                if status_value == Sale.Status.COMPLETED:
                    if not payment_method:
                        raise serializers.ValidationError(
                            {"payment_method": "Payment method is required for completed cashier transactions."}
                        )
        else:
            # Anonymous / Online Store
            if _is_held_status(status_value):
                raise serializers.ValidationError(
                    {"status": "HELD status is not allowed for this channel."}
                )
            if instance.status == Sale.HELD_STATUS:
                raise PermissionDenied("You do not have permission to access this transaction.")
        return attrs

    def update(self, instance, validated_data):
        old_status = instance.status
        new_status = validated_data.get("status", old_status)
        business = instance.business
        request = self.context.get("request")

        if (
            old_status == Sale.Status.COMPLETED
            and new_status == Sale.Status.VOIDED
        ):
            raise serializers.ValidationError(
                {
                    "status": "Voiding a completed sale requires stock reversal "
                    "which is not defined in the contract."
                }
            )
        with transaction.atomic():
            if "location" in validated_data:
                instance.location = validated_data["location"]
            if "customer" in validated_data:
                instance.customer = validated_data["customer"]
            if "status" in validated_data:
                instance.status = new_status
            if "payment_method" in validated_data:
                instance.payment_method = validated_data["payment_method"]
            if "lines" in validated_data:
                instance.lines.all().delete()
                for line in validated_data["lines"]:
                    promotion = line.get("applied_promotion")
                    line_kwargs = {
                        "sale": instance,
                        "variant": line["variant"],
                        "quantity": line["quantity"],
                        "unit_price": line["unit_price"],
                    }
                    if promotion is not None:
                        line_kwargs["applied_promotion"] = promotion
                    SaleLine.objects.create(**line_kwargs)

            # Link shift if not linked yet
            if not instance.shift:
                instance.shift = _resolve_and_link_shift(request.user if request else None, business, instance.location)

            if new_status == Sale.Status.COMPLETED and old_status != Sale.Status.COMPLETED:
                _snapshot_promotions_for_sale(instance)
                instance.loyalty_earned = Decimal("0")
            instance.save()
            if new_status == Sale.Status.COMPLETED and old_status != Sale.Status.COMPLETED:
                _reduce_stock_for_sale(instance)
        return instance
