from rest_framework import serializers

from apps.customer.models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    business = serializers.UUIDField(source="business.id", read_only=True)

    class Meta:
        model = Customer
        fields = [
            "id",
            "business",
            "name",
            "phone",
            "email",
            "address",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "created_at",
            "updated_at",
        ]


class CustomerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["name", "phone", "email", "address"]

    def validate_name(self, value):
        if value is None or not value.strip():
            raise serializers.ValidationError(
                "Name must not be empty or whitespace only."
            )
        return value

    def create(self, validated_data):
        business = self.context["business"]
        return Customer.objects.create(business=business, **validated_data)


class CustomerUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["name", "phone", "email", "address"]

    def validate_name(self, value):
        if value is None or not value.strip():
            raise serializers.ValidationError(
                "Name must not be empty or whitespace only."
            )
        return value
