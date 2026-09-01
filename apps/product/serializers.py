from decimal import Decimal, InvalidOperation

from rest_framework import serializers

from apps.product.models import Product, Variant


def normalize_indonesian_price(raw):
    if isinstance(raw, (int, float, Decimal)):
        return Decimal(str(raw))
    s = str(raw).strip()
    has_comma = "," in s
    has_dot = "." in s
    if has_comma and has_dot:
        s = s.replace(".", "").replace(",", ".")
    elif has_dot:
        _, _, frac = s.partition(".")
        if frac and len(frac) not in (1, 2):
            s = s.replace(".", "")
    try:
        return Decimal(s)
    except (InvalidOperation, ValueError):
        raise serializers.ValidationError("Invalid price format.")


class PriceField(serializers.Field):
    def to_internal_value(self, data):
        try:
            value = normalize_indonesian_price(data)
        except serializers.ValidationError:
            raise
        except (InvalidOperation, TypeError, ValueError):
            raise serializers.ValidationError("Invalid price format.")
        if value < 0:
            raise serializers.ValidationError("Price must not be negative.")
        return value

    def to_representation(self, value):
        dec = Decimal(str(value))
        if dec == dec.to_integral_value():
            return int(dec)
        return str(dec)


class ProductSerializer(serializers.ModelSerializer):
    business = serializers.UUIDField(source="business.id", read_only=True)
    price = PriceField()

    class Meta:
        model = Product
        fields = ["id", "name", "price", "business", "created_at", "updated_at"]
        read_only_fields = ["id", "business", "created_at", "updated_at"]


class ProductCreateSerializer(serializers.ModelSerializer):
    price = PriceField()

    class Meta:
        model = Product
        fields = ["name", "price"]

    def validate_name(self, value):
        if value is None or not value.strip():
            raise serializers.ValidationError("Name must not be empty or whitespace only.")
        return value

    def create(self, validated_data):
        business = self.context["business"]
        return Product.objects.create(business=business, **validated_data)


class ProductUpdateSerializer(serializers.ModelSerializer):
    price = PriceField()

    class Meta:
        model = Product
        fields = ["name", "price"]

    def validate_name(self, value):
        if value is None or not value.strip():
            raise serializers.ValidationError("Name must not be empty or whitespace only.")
        return value


class VariantSerializer(serializers.ModelSerializer):
    product = serializers.UUIDField(source="product.id", read_only=True)
    cost_price = PriceField()

    class Meta:
        model = Variant
        fields = ["id", "product", "name", "cost_price", "created_at", "updated_at"]
        read_only_fields = ["id", "product", "created_at", "updated_at"]


class VariantCreateSerializer(serializers.ModelSerializer):
    cost_price = PriceField(required=False)

    class Meta:
        model = Variant
        fields = ["name", "cost_price"]

    def validate_name(self, value):
        if value is None or not value.strip():
            raise serializers.ValidationError("Name must not be empty or whitespace only.")
        return value

    def create(self, validated_data):
        product = self.context["product"]
        return Variant.objects.create(product=product, **validated_data)
