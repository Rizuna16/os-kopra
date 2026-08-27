from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers

from apps.business.models import Location
from apps.inventory.models import Batch, SerialNumber, Stock
from apps.product.models import Variant


class StockSerializer(serializers.ModelSerializer):
    location = serializers.UUIDField(source="location.id", read_only=True)
    variant = serializers.UUIDField(source="variant.id", read_only=True)

    class Meta:
        model = Stock
        fields = [
            "id",
            "location",
            "variant",
            "quantity",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "location",
            "variant",
            "created_at",
            "updated_at",
        ]


class StockCreateSerializer(serializers.Serializer):
    variant_id = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Quantity must be greater than 0."
            )
        return value

    def validate_variant_id(self, value):
        business = self.context["business"]
        location = self.context["location"]
        variant = get_object_or_404(
            Variant.objects.filter(product__business=business),
            pk=value,
        )
        if Stock.objects.filter(variant=variant, location=location).exists():
            raise serializers.ValidationError(
                "Stock already exists for this variant and location."
            )
        return variant

    def create(self, validated_data):
        location = self.context["location"]
        variant = validated_data.pop("variant_id")
        return Stock.objects.create(
            variant=variant,
            location=location,
            quantity=validated_data["quantity"],
        )


class StockTransferSerializer(serializers.Serializer):
    source_location = serializers.UUIDField()
    destination_location = serializers.UUIDField()
    variant = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Quantity must be greater than 0."
            )
        return value

    def validate(self, data):
        request = self.context["request"]
        source_id = data["source_location"]
        dest_id = data["destination_location"]
        variant_id = data["variant"]
        quantity = data["quantity"]

        if source_id == dest_id:
            raise serializers.ValidationError(
                "Source and destination locations must be different."
            )

        source_location = get_object_or_404(
            Location.objects.filter(
                Q(business__owner=request.user) | Q(business__memberships__user=request.user)
            ).distinct(),
            pk=source_id
        )
        dest_location = get_object_or_404(
            Location.objects.filter(
                Q(business__owner=request.user) | Q(business__memberships__user=request.user)
            ).distinct(),
            pk=dest_id
        )

        if source_location.business_id != dest_location.business_id:
            raise serializers.ValidationError(
                "Source and destination must be in the same business."
            )

        variant = get_object_or_404(
            Variant.objects.filter(product__business=source_location.business), pk=variant_id
        )

        data["source_location"] = source_location
        data["destination_location"] = dest_location
        data["variant"] = variant
        return data

    def create(self, validated_data):
        from django.db import IntegrityError

        source_loc = validated_data["source_location"]
        dest_loc = validated_data["destination_location"]
        variant_obj = validated_data["variant"]
        quantity = validated_data["quantity"]

        with transaction.atomic():
            try:
                source_stock = Stock.objects.select_for_update().get(
                    location=source_loc, variant=variant_obj
                )
            except Stock.DoesNotExist:
                raise serializers.ValidationError(
                    {
                        "source_location": "No stock available at source location for this variant."
                    }
                )

            if source_stock.quantity < quantity:
                raise serializers.ValidationError(
                    {"quantity": "Insufficient stock at source."}
                )

            dest_stock = Stock.objects.filter(
                location=dest_loc, variant=variant_obj
            ).first()
            if dest_stock is None:
                try:
                    dest_stock = Stock.objects.create(
                        location=dest_loc, variant=variant_obj, quantity=Decimal("0")
                    )
                except IntegrityError:
                    dest_stock = Stock.objects.get(
                        location=dest_loc, variant=variant_obj
                    )
            dest_stock = Stock.objects.select_for_update().get(pk=dest_stock.pk)

            source_stock.quantity -= quantity
            dest_stock.quantity += quantity

            source_stock.save()
            dest_stock.save()

        return {"source_stock": source_stock, "dest_stock": dest_stock}


class StockAdjustmentSerializer(serializers.Serializer):
    location = serializers.UUIDField()
    variant = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)

    def validate_quantity(self, value):
        if value == 0:
            raise serializers.ValidationError(
                "Quantity must not be zero."
            )
        return value

    def validate(self, data):
        request = self.context["request"]
        location_id = data["location"]
        variant_id = data["variant"]
        quantity = data["quantity"]

        location = get_object_or_404(
            Location.objects.filter(
                Q(business__owner=request.user) | Q(business__memberships__user=request.user)
            ).distinct(),
            pk=location_id
        )
        variant = get_object_or_404(
            Variant.objects.filter(product__business=location.business), pk=variant_id
        )

        data["location"] = location
        data["variant"] = variant
        return data

    def create(self, validated_data):
        from django.db import IntegrityError

        location = validated_data["location"]
        variant = validated_data["variant"]
        quantity = validated_data["quantity"]

        with transaction.atomic():
            stock = Stock.objects.filter(
                location=location, variant=variant
            ).first()

            if stock is None:
                if quantity <= 0:
                    raise serializers.ValidationError(
                        {"quantity": "No stock available at this location for adjustment."}
                    )
                try:
                    stock = Stock.objects.create(
                        location=location, variant=variant, quantity=quantity
                    )
                    return stock
                except IntegrityError:
                    stock = Stock.objects.select_for_update().get(
                        location=location, variant=variant
                    )

            stock = Stock.objects.select_for_update().get(pk=stock.pk)
            new_quantity = stock.quantity + quantity

            if new_quantity < 0:
                raise serializers.ValidationError(
                    {"quantity": "Adjustment would result in negative stock."}
                )

            stock.quantity = new_quantity
            stock.save()

        return stock


class BatchSerializer(serializers.ModelSerializer):
    location = serializers.UUIDField(source="location.id", read_only=True)
    variant = serializers.UUIDField(source="variant.id", read_only=True)

    class Meta:
        model = Batch
        fields = [
            "id",
            "code",
            "location",
            "variant",
            "quantity",
            "expired_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "location",
            "variant",
            "created_at",
            "updated_at",
        ]

    def validate_code(self, value):
        if self.instance is not None:
            if (
                Batch.objects.filter(location=self.instance.location, code=value)
                .exclude(pk=self.instance.pk)
                .exists()
            ):
                raise serializers.ValidationError(
                    "Batch code already exists for this location."
                )
        return value

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Quantity must not be negative."
            )
        return value


class BatchCreateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=255)
    variant = serializers.UUIDField()
    location = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)
    expired_date = serializers.DateField(allow_null=True, required=False)

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Quantity must not be negative."
            )
        return value

    def validate(self, data):
        request = self.context["request"]
        location = get_object_or_404(
            Location.objects.filter(business__owner=request.user), pk=data["location"]
        )
        variant = get_object_or_404(
            Variant.objects.filter(product__business=location.business), pk=data["variant"]
        )
        if (
            Batch.objects.filter(location=location, code=data["code"]).exists()
        ):
            raise serializers.ValidationError(
                {"code": "Batch code already exists for this location."}
            )
        data["location"] = location
        data["variant"] = variant
        return data

    def create(self, validated_data):
        location = validated_data["location"]
        variant = validated_data["variant"]
        return Batch.objects.create(
            code=validated_data["code"],
            location=location,
            variant=variant,
            quantity=validated_data["quantity"],
            expired_date=validated_data.get("expired_date"),
        )


class SerialNumberSerializer(serializers.ModelSerializer):
    batch = serializers.UUIDField(source="batch.id", read_only=True)

    class Meta:
        model = SerialNumber
        fields = [
            "id",
            "batch",
            "serial_number",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "batch",
            "created_at",
            "updated_at",
        ]

    def validate_serial_number(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError(
                "Serial number must not be empty."
            )
        value = value.strip()
        qs = SerialNumber.objects.filter(serial_number=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "Serial number already exists."
            )
        return value


class SerialNumberCreateSerializer(serializers.Serializer):
    batch = serializers.UUIDField()
    serial_number = serializers.CharField(max_length=255)

    def validate_serial_number(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError(
                "Serial number must not be empty."
            )
        return value.strip()

    def validate(self, data):
        request = self.context["request"]
        batch = get_object_or_404(
            Batch.objects.filter(
                Q(location__business__owner=request.user) | Q(location__business__memberships__user=request.user)
            ).distinct(),
            pk=data["batch"],
        )
        if SerialNumber.objects.filter(serial_number=data["serial_number"]).exists():
            raise serializers.ValidationError(
                {"serial_number": "Serial number already exists."}
            )
        data["batch"] = batch
        return data

    def create(self, validated_data):
        return SerialNumber.objects.create(
            batch=validated_data["batch"],
            serial_number=validated_data["serial_number"].strip(),
        )


class StockOpnameSerializer(serializers.Serializer):
    location = serializers.UUIDField()
    variant = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Quantity must not be negative."
            )
        return value

    def validate(self, data):
        request = self.context["request"]
        location_id = data["location"]
        variant_id = data["variant"]

        location = get_object_or_404(
            Location.objects.filter(
                Q(business__owner=request.user) | Q(business__memberships__user=request.user)
            ).distinct(),
            pk=location_id
        )
        variant = get_object_or_404(
            Variant.objects.filter(product__business=location.business), pk=variant_id
        )

        data["location"] = location
        data["variant"] = variant
        return data

    def create(self, validated_data):
        from django.db import IntegrityError

        location = validated_data["location"]
        variant = validated_data["variant"]
        quantity = validated_data["quantity"]

        with transaction.atomic():
            stock = Stock.objects.filter(
                location=location, variant=variant
            ).first()

            if stock is None:
                if quantity == 0:
                    return None
                try:
                    stock = Stock.objects.create(
                        location=location, variant=variant, quantity=quantity
                    )
                    return stock
                except IntegrityError:
                    stock = Stock.objects.select_for_update().get(
                        location=location, variant=variant
                    )

            stock = Stock.objects.select_for_update().get(pk=stock.pk)
            stock.quantity = quantity
            stock.save()

        return stock
