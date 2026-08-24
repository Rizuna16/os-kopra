from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.business.models import Location
from apps.customer.models import Customer
from apps.inventory.models import Stock
from apps.product.models import Variant
from apps.promotion_loyalty.models import Promotion
from apps.sales.models import Sale, SaleLine


def _reduce_stock_for_sale(sale):
    for line in sale.lines.all():
        stock, _ = Stock.objects.select_for_update().get_or_create(
            location=sale.location,
            variant=line.variant,
            defaults={"quantity": Decimal("0")},
        )
        stock.quantity -= line.quantity
        stock.save()


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

    class Meta:
        model = Sale
        fields = [
            "id",
            "business",
            "location",
            "customer",
            "loyalty_earned",
            "status",
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


class SaleCreateSerializer(serializers.Serializer):
    location = serializers.UUIDField()
    customer = serializers.UUIDField(required=False, allow_null=True)
    status = serializers.ChoiceField(
        choices=Sale.Status.choices, default=Sale.Status.DRAFT
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

    def create(self, validated_data):
        business = self.context.get("business")
        location = validated_data["location"]
        customer = validated_data.get("customer")
        status_value = validated_data.get("status", Sale.Status.DRAFT)
        lines_data = validated_data.get("lines", [])
        with transaction.atomic():
            sale = Sale.objects.create(
                business=business,
                location=location,
                customer=customer,
                status=status_value,
            )
            for line in lines_data:
                promotion = line.get("applied_promotion")
                line_kwargs = {
                    "sale": sale,
                    "variant": line["variant"],
                    "quantity": line["quantity"],
                    "unit_price": line["unit_price"],
                }
                # Store the promotion reference at any status; do NOT snapshot
                # discount values until the COMPLETED transition (contract v1 J).
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
        # Applied promotion must still belong to the same Business.
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
        choices=Sale.Status.choices, required=False
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

    def update(self, instance, validated_data):
        old_status = instance.status
        new_status = validated_data.get("status", old_status)
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
                    # Store the promotion reference; do NOT snapshot until COMPLETED.
                    if promotion is not None:
                        line_kwargs["applied_promotion"] = promotion
                    SaleLine.objects.create(**line_kwargs)
            # Snapshot promotion discount values only at the COMPLETED transition.
            if new_status == Sale.Status.COMPLETED and old_status != Sale.Status.COMPLETED:
                _snapshot_promotions_for_sale(instance)
                instance.loyalty_earned = Decimal("0")
            instance.save()
            if new_status == Sale.Status.COMPLETED and old_status != Sale.Status.COMPLETED:
                _reduce_stock_for_sale(instance)
        return instance
