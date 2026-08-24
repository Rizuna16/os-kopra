from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.business.models import Location
from apps.product.models import Variant
from apps.purchasing.models import PurchaseOrder, PurchaseOrderLine
from apps.supplier.models import Supplier


class PurchaseOrderLineSerializer(serializers.ModelSerializer):
    variant = serializers.UUIDField(source="variant.id", read_only=True)

    class Meta:
        model = PurchaseOrderLine
        fields = [
            "id",
            "variant",
            "quantity",
            "unit_price",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "variant",
            "created_at",
            "updated_at",
        ]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    business = serializers.UUIDField(source="business.id", read_only=True)
    supplier = serializers.UUIDField(source="supplier.id", read_only=True)
    location = serializers.UUIDField(source="location.id", read_only=True)
    lines = PurchaseOrderLineSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "business",
            "supplier",
            "location",
            "status",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "supplier",
            "location",
            "lines",
            "created_at",
            "updated_at",
        ]


class PurchaseOrderLineCreateSerializer(serializers.Serializer):
    variant = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)

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


class PurchaseOrderCreateSerializer(serializers.Serializer):
    supplier = serializers.UUIDField()
    location = serializers.UUIDField()
    status = serializers.ChoiceField(
        choices=PurchaseOrder.Status.choices,
        default=PurchaseOrder.Status.DRAFT,
    )
    lines = PurchaseOrderLineCreateSerializer(many=True, required=False)

    def validate_supplier(self, value):
        business = self.context.get("business")
        supplier = Supplier.objects.filter(business=business, pk=value).first()
        if supplier is None:
            raise serializers.ValidationError(
                "Supplier does not belong to this business."
            )
        return supplier

    def validate_location(self, value):
        business = self.context.get("business")
        location = Location.objects.filter(business=business, pk=value).first()
        if location is None:
            raise serializers.ValidationError(
                "Location does not belong to this business."
            )
        return location

    def create(self, validated_data):
        business = self.context.get("business")
        supplier = validated_data["supplier"]
        location = validated_data["location"]
        status_value = validated_data.get("status", PurchaseOrder.Status.DRAFT)
        lines_data = validated_data.get("lines", [])
        with transaction.atomic():
            po = PurchaseOrder.objects.create(
                business=business,
                supplier=supplier,
                location=location,
                status=status_value,
            )
            for line in lines_data:
                PurchaseOrderLine.objects.create(
                    purchase_order=po,
                    variant=line["variant"],
                    quantity=line["quantity"],
                    unit_price=line["unit_price"],
                )
        return po


class PurchaseOrderUpdateSerializer(serializers.Serializer):
    supplier = serializers.UUIDField(required=False)
    location = serializers.UUIDField(required=False)
    status = serializers.ChoiceField(
        choices=PurchaseOrder.Status.choices, required=False
    )
    lines = PurchaseOrderLineCreateSerializer(many=True, required=False)

    def validate_supplier(self, value):
        business = self.context.get("business")
        supplier = Supplier.objects.filter(business=business, pk=value).first()
        if supplier is None:
            raise serializers.ValidationError(
                "Supplier does not belong to this business."
            )
        return supplier

    def validate_location(self, value):
        business = self.context.get("business")
        location = Location.objects.filter(business=business, pk=value).first()
        if location is None:
            raise serializers.ValidationError(
                "Location does not belong to this business."
            )
        return location

    def update(self, instance, validated_data):
        with transaction.atomic():
            if "supplier" in validated_data:
                instance.supplier = validated_data["supplier"]
            if "location" in validated_data:
                instance.location = validated_data["location"]
            if "status" in validated_data:
                instance.status = validated_data["status"]
            instance.save()
            if "lines" in validated_data:
                instance.lines.all().delete()
                for line in validated_data["lines"]:
                    PurchaseOrderLine.objects.create(
                        purchase_order=instance,
                        variant=line["variant"],
                        quantity=line["quantity"],
                        unit_price=line["unit_price"],
                    )
        return instance
