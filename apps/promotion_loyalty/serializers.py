from decimal import Decimal

from rest_framework import serializers

from apps.customer.models import Customer
from apps.product.models import Product, Variant

from .models import CustomerLoyaltyRecord, LoyaltyProgram, Promotion


class PromotionSerializer(serializers.ModelSerializer):
    business = serializers.UUIDField(source="business.id", read_only=True)
    target_product = serializers.UUIDField(
        source="target_product.id", read_only=True, allow_null=True
    )
    target_variant = serializers.UUIDField(
        source="target_variant.id", read_only=True, allow_null=True
    )

    class Meta:
        model = Promotion
        fields = [
            "id",
            "business",
            "name",
            "discount_type",
            "discount_value",
            "valid_from",
            "valid_to",
            "status",
            "applicability",
            "target_product",
            "target_variant",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "created_at",
            "updated_at",
        ]


class PromotionCreateSerializer(serializers.ModelSerializer):
    target_product = serializers.UUIDField(required=False, allow_null=True)
    target_variant = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = Promotion
        fields = [
            "name",
            "discount_type",
            "discount_value",
            "valid_from",
            "valid_to",
            "status",
            "applicability",
            "target_product",
            "target_variant",
        ]

    def validate_name(self, value):
        if value is None or not value.strip():
            raise serializers.ValidationError(
                "Name must not be empty or whitespace only."
            )
        return value

    def validate_discount_value(self, value):
        if value is None or value <= Decimal("0"):
            raise serializers.ValidationError(
                "Discount value must be positive."
            )
        return value

    def validate(self, attrs):
        discount_type = attrs.get("discount_type")
        discount_value = attrs.get("discount_value")
        if discount_type == Promotion.DiscountType.PERCENTAGE and discount_value is not None:
            if discount_value > Decimal("100"):
                raise serializers.ValidationError(
                    {"discount_value": "Percentage discount cannot exceed 100."}
                )
        if discount_type == Promotion.DiscountType.FIXED and discount_value is not None:
            if discount_value <= Decimal("0"):
                raise serializers.ValidationError(
                    {"discount_value": "Fixed discount must be greater than 0."}
                )

        valid_from = attrs.get("valid_from")
        valid_to = attrs.get("valid_to")
        if valid_from and valid_to and valid_from > valid_to:
            raise serializers.ValidationError(
                {"valid_to": "valid_to must not be earlier than valid_from."}
            )

        applicability = attrs.get("applicability")
        business = self.context.get("business")
        target_product = attrs.get("target_product")
        target_variant = attrs.get("target_variant")

        if applicability == Promotion.Applicability.BUSINESS_WIDE:
            if target_product is not None or target_variant is not None:
                raise serializers.ValidationError(
                    "Business-wide promotion must not target a product or variant."
                )
        elif applicability == Promotion.Applicability.PRODUCT_VARIANT:
            if target_product is None and target_variant is None:
                raise serializers.ValidationError(
                    "Product/Variant promotion requires a target product or variant."
                )
            if target_product is not None and target_variant is not None:
                raise serializers.ValidationError(
                    "Promotion may target a product or a variant, not both."
                )
            if target_product is not None:
                product = self._resolve(Product, target_product, business)
                attrs["target_product"] = product
            if target_variant is not None:
                variant = self._resolve(Variant, target_variant, business)
                attrs["target_variant"] = variant
        return attrs

    def _resolve(self, model, pk, business):
        lookup = (
            {"product__business": business}
            if model is Variant
            else {"business": business}
        )
        try:
            obj = model.objects.get(pk=pk, **lookup)
        except (model.DoesNotExist, ValueError):
            raise serializers.ValidationError(
                {"target": "Target must belong to the same business."}
            )
        return obj

    def create(self, validated_data):
        business = self.context["business"]
        return Promotion.objects.create(business=business, **validated_data)


class PromotionUpdateSerializer(serializers.ModelSerializer):
    target_product = serializers.UUIDField(required=False, allow_null=True)
    target_variant = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = Promotion
        fields = [
            "name",
            "discount_type",
            "discount_value",
            "valid_from",
            "valid_to",
            "status",
            "applicability",
            "target_product",
            "target_variant",
        ]

    def validate_name(self, value):
        if value is None or not value.strip():
            raise serializers.ValidationError(
                "Name must not be empty or whitespace only."
            )
        return value

    def validate_discount_value(self, value):
        if value is None or value <= Decimal("0"):
            raise serializers.ValidationError(
                "Discount value must be positive."
            )
        return value

    def validate(self, attrs):
        instance = self.instance
        discount_type = attrs.get("discount_type", instance.discount_type)
        discount_value = attrs.get("discount_value", instance.discount_value)
        if discount_type == Promotion.DiscountType.PERCENTAGE and discount_value is not None:
            if discount_value > Decimal("100"):
                raise serializers.ValidationError(
                    {"discount_value": "Percentage discount cannot exceed 100."}
                )

        valid_from = attrs.get("valid_from", instance.valid_from)
        valid_to = attrs.get("valid_to", instance.valid_to)
        if valid_from and valid_to and valid_from > valid_to:
            raise serializers.ValidationError(
                {"valid_to": "valid_to must not be earlier than valid_from."}
            )

        applicability = attrs.get("applicability", instance.applicability)
        business = self.context.get("business")

        # Only enforce applicability/target consistency if applicability or target fields
        # are explicitly included in the request.
        applicability_changed = "applicability" in attrs
        target_product_sent = "target_product" in attrs
        target_variant_sent = "target_variant" in attrs

        if applicability_changed or target_product_sent or target_variant_sent:
            target_product = attrs.get("target_product", instance.target_product)
            target_variant = attrs.get("target_variant", instance.target_variant)

            if applicability == Promotion.Applicability.BUSINESS_WIDE:
                if target_product is not None or target_variant is not None:
                    raise serializers.ValidationError(
                        "Business-wide promotion must not target a product or variant."
                    )
            elif applicability == Promotion.Applicability.PRODUCT_VARIANT:
                if target_product is None and target_variant is None:
                    raise serializers.ValidationError(
                        "Product/Variant promotion requires a target product or variant."
                    )
                if target_product is not None and target_variant is not None:
                    raise serializers.ValidationError(
                        "Promotion may target a product or a variant, not both."
                    )
                if target_product is not None:
                    attrs["target_product"] = self._resolve(
                        Product, target_product.id, business
                    )
                if target_variant is not None:
                    attrs["target_variant"] = self._resolve(
                        Variant, target_variant.id, business
                    )
        return attrs

    def _resolve(self, model, pk, business):
        lookup = (
            {"product__business": business}
            if model is Variant
            else {"business": business}
        )
        try:
            obj = model.objects.get(pk=pk, **lookup)
        except (model.DoesNotExist, ValueError, AttributeError):
            raise serializers.ValidationError(
                {"target": "Target must belong to the same business."}
            )
        return obj

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class LoyaltyProgramSerializer(serializers.ModelSerializer):
    business = serializers.UUIDField(source="business.id", read_only=True)

    class Meta:
        model = LoyaltyProgram
        fields = [
            "id",
            "business",
            "name",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "created_at",
            "updated_at",
        ]


class LoyaltyProgramCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyProgram
        fields = ["name", "status"]

    def validate_name(self, value):
        if value is None or not value.strip():
            raise serializers.ValidationError(
                "Name must not be empty or whitespace only."
            )
        return value

    def create(self, validated_data):
        business = self.context["business"]
        return LoyaltyProgram.objects.create(business=business, **validated_data)


class LoyaltyProgramUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyProgram
        fields = ["name", "status"]

    def validate_name(self, value):
        if value is None or not value.strip():
            raise serializers.ValidationError(
                "Name must not be empty or whitespace only."
            )
        return value


class CustomerLoyaltyRecordSerializer(serializers.ModelSerializer):
    business = serializers.UUIDField(source="program.business.id", read_only=True)
    program = serializers.UUIDField(source="program.id", read_only=True)
    customer = serializers.UUIDField(source="customer.id", read_only=True)

    class Meta:
        model = CustomerLoyaltyRecord
        fields = [
            "id",
            "business",
            "program",
            "customer",
            "points_balance",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "program",
            "customer",
            "created_at",
            "updated_at",
        ]


class CustomerLoyaltyRecordCreateSerializer(serializers.ModelSerializer):
    customer = serializers.UUIDField()

    class Meta:
        model = CustomerLoyaltyRecord
        fields = ["customer", "points_balance"]

    def validate_points_balance(self, value):
        if value is None or value < Decimal("0"):
            raise serializers.ValidationError(
                "Points balance must not be negative."
            )
        return value

    def validate(self, attrs):
        program = self.context.get("program")
        business = program.business
        customer_id = attrs.get("customer")
        try:
            customer = Customer.objects.get(pk=customer_id, business=business)
        except (Customer.DoesNotExist, ValueError):
            raise serializers.ValidationError(
                {"customer": "Customer must belong to the same business."}
            )
        attrs["customer"] = customer
        if CustomerLoyaltyRecord.objects.filter(
            program=program, customer=customer
        ).exists():
            raise serializers.ValidationError(
                "Loyalty record already exists for this customer."
            )
        return attrs

    def create(self, validated_data):
        program = self.context["program"]
        return CustomerLoyaltyRecord.objects.create(
            program=program, **validated_data
        )


class CustomerLoyaltyRecordUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerLoyaltyRecord
        fields = ["points_balance"]

    def validate_points_balance(self, value):
        if value is None or value < Decimal("0"):
            raise serializers.ValidationError(
                "Points balance must not be negative."
            )
        return value
