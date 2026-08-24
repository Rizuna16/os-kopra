from rest_framework import serializers

from apps.onlinestore.models import (
    Cart,
    CartItem,
    OnlineOrder,
    OnlineOrderLine,
    OnlineStore,
    OnlineStoreProduct,
)
from apps.product.models import Product, Variant


class OnlineStoreSerializer(serializers.ModelSerializer):
    business = serializers.UUIDField(source="business.id", read_only=True)
    default_location = serializers.UUIDField(source="default_location.id", read_only=True)

    class Meta:
        model = OnlineStore
        fields = [
            "id",
            "business",
            "name",
            "slug",
            "default_location",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "created_at",
            "updated_at",
        ]


class OnlineStoreCreateSerializer(serializers.ModelSerializer):
    default_location = serializers.UUIDField()

    class Meta:
        model = OnlineStore
        fields = ["name", "slug", "default_location"]

    def validate_slug(self, value):
        if OnlineStore.objects.filter(slug=value).exists():
            raise serializers.ValidationError("Slug already exists.")
        return value

    def validate_default_location(self, value):
        business = self.context["business"]
        from apps.business.models import Location
        location = Location.objects.filter(business=business, pk=value).first()
        if location is None:
            raise serializers.ValidationError("Location does not belong to this business.")
        return location

    def create(self, validated_data):
        business = self.context["business"]
        location = validated_data.pop("default_location")
        if OnlineStore.objects.filter(business=business).exists():
            raise serializers.ValidationError("Business already has an online store.")
        return OnlineStore.objects.create(
            business=business, default_location=location, **validated_data
        )


class OnlineStoreProductSerializer(serializers.ModelSerializer):
    online_store = serializers.UUIDField(source="online_store.id", read_only=True)
    product = serializers.UUIDField(source="product.id", read_only=True)

    class Meta:
        model = OnlineStoreProduct
        fields = ["id", "online_store", "product", "is_published", "created_at", "updated_at"]
        read_only_fields = ["id", "online_store", "product", "created_at", "updated_at"]


class OnlineStoreProductCreateSerializer(serializers.ModelSerializer):
    product = serializers.UUIDField()

    class Meta:
        model = OnlineStoreProduct
        fields = ["product", "is_published"]

    def validate_product(self, value):
        business = self.context["business"]
        product = Product.objects.filter(business=business, pk=value).first()
        if product is None:
            raise serializers.ValidationError("Product does not belong to this business.")
        return product

    def create(self, validated_data):
        online_store = self.context["online_store"]
        product = validated_data.pop("product")
        if OnlineStoreProduct.objects.filter(online_store=online_store, product=product).exists():
            raise serializers.ValidationError("Product already published in this store.")
        return OnlineStoreProduct.objects.create(
            online_store=online_store, product=product, **validated_data
        )

    def update(self, instance, validated_data):
        instance.is_published = validated_data.get("is_published", instance.is_published)
        instance.save()
        return instance


class CartSerializer(serializers.ModelSerializer):
    online_store = serializers.UUIDField(source="online_store.id", read_only=True)
    customer = serializers.UUIDField(source="customer.id", read_only=True, allow_null=True)
    items = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "online_store", "session_token", "customer", "items", "created_at", "updated_at"]
        read_only_fields = ["id", "online_store", "customer", "created_at", "updated_at"]

    def get_items(self, obj):
        items = obj.items.select_related("variant__product").all()
        return CartItemSerializer(items, many=True).data


class CartItemSerializer(serializers.ModelSerializer):
    variant = serializers.UUIDField(source="variant.id", read_only=True)

    class Meta:
        model = CartItem
        fields = ["id", "variant", "quantity", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class CartItemCreateSerializer(serializers.Serializer):
    session_token = serializers.CharField(max_length=255)
    variant = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value

    def validate_variant(self, value):
        online_store = self.context["online_store"]
        variant = Variant.objects.filter(
            product__online_store_publishings__online_store=online_store,
            product__online_store_publishings__is_published=True,
            pk=value,
        ).first()
        if variant is None:
            raise serializers.ValidationError("Variant not found or not published in this store.")
        return variant

    def validate_session_token(self, value):
        return value

    def create(self, validated_data):
        online_store = self.context["online_store"]
        session_token = validated_data["session_token"]
        cart, _ = Cart.objects.get_or_create(
            online_store=online_store,
            session_token=session_token,
        )
        variant = validated_data["variant"]
        quantity = validated_data["quantity"]
        CartItem.objects.create(
            cart=cart, variant=variant, quantity=quantity
        )
        return cart


class OnlineOrderLineSerializer(serializers.ModelSerializer):
    variant = serializers.UUIDField(source="variant.id", read_only=True)

    class Meta:
        model = OnlineOrderLine
        fields = ["id", "variant", "quantity", "unit_price", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class OnlineOrderSerializer(serializers.ModelSerializer):
    online_store = serializers.UUIDField(source="online_store.id", read_only=True)
    customer = serializers.UUIDField(source="customer.id", read_only=True, allow_null=True)
    sale = serializers.UUIDField(source="sale.id", read_only=True, allow_null=True)
    lines = OnlineOrderLineSerializer(many=True, read_only=True)

    class Meta:
        model = OnlineOrder
        fields = [
            "id",
            "online_store",
            "customer",
            "sale",
            "status",
            "guest_name",
            "guest_email",
            "guest_phone",
            "shipping_address",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "online_store",
            "customer",
            "sale",
            "created_at",
            "updated_at",
        ]


class OnlineOrderCreateSerializer(serializers.Serializer):
    guest_name = serializers.CharField(max_length=255)
    guest_email = serializers.EmailField(max_length=254, required=False, allow_blank=True)
    guest_phone = serializers.CharField(max_length=50, required=False, allow_blank=True)
    shipping_address = serializers.CharField()
    lines = serializers.ListField(
        child=serializers.DictField(
            child=serializers.JSONField()
        ),
        min_length=1,
    )

    def validate_guest_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Guest name is required.")
        return value.strip()

    def validate_lines(self, value):
        if not value:
            raise serializers.ValidationError("At least one line item is required.")
        for line in value:
            if "variant" not in line or "quantity" not in line:
                raise serializers.ValidationError("Each line must have variant and quantity.")
            try:
                quantity = int(line["quantity"])
                if quantity <= 0:
                    raise serializers.ValidationError("Quantity must be positive.")
            except (ValueError, TypeError):
                raise serializers.ValidationError("Quantity must be a positive integer.")
        return value

    def validate(self, attrs):
        online_store = self.context["online_store"]
        lines = attrs.get("lines", [])
        for line in lines:
            variant_id = line["variant"]
            variant = Variant.objects.filter(
                product__online_store_publishings__online_store=online_store,
                product__online_store_publishings__is_published=True,
                pk=variant_id,
            ).first()
            if variant is None:
                raise serializers.ValidationError(
                    {"variant": f"Variant {variant_id} not found or not published in this store."}
                )
        return attrs

    def create(self, validated_data):
        online_store = self.context["online_store"]
        lines_data = validated_data.pop("lines")
        order = OnlineOrder.objects.create(
            online_store=online_store,
            **validated_data,
        )
        for line_data in lines_data:
            variant_id = line_data["variant"]
            variant = Variant.objects.get(pk=variant_id)
            OnlineOrderLine.objects.create(
                online_order=order,
                variant=variant,
                quantity=line_data["quantity"],
                unit_price=variant.product.price,
            )
        return order


class PublicStoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = OnlineStore
        fields = ["id", "name", "slug", "is_active"]


class PublicProductSerializer(serializers.ModelSerializer):
    variants = serializers.SerializerMethodField()
    price = serializers.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        model = Product
        fields = ["id", "name", "price", "variants"]

    def get_variants(self, obj):
        online_store = self.context["online_store"]
        variants = Variant.objects.filter(
            product=obj,
            product__online_store_publishings__online_store=online_store,
            product__online_store_publishings__is_published=True,
        ).select_related("product")
        return PublicVariantSerializer(variants, many=True, context=self.context).data


class PublicVariantSerializer(serializers.ModelSerializer):
    available = serializers.SerializerMethodField()

    class Meta:
        model = Variant
        fields = ["id", "name", "available"]

    def get_available(self, obj):
        online_store = self.context["online_store"]
        from apps.inventory.models import Stock
        stock = Stock.objects.filter(
            location=online_store.default_location,
            variant=obj,
        ).first()
        return stock.quantity if stock else 0