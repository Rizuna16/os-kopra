from rest_framework import serializers

from apps.supplier.models import Supplier


class SupplierSerializer(serializers.ModelSerializer):
    business = serializers.UUIDField(source="business.id", read_only=True)

    class Meta:
        model = Supplier
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

    def validate_name(self, value):
        business = self.context.get("business")
        if business is not None:
            qs = Supplier.objects.filter(business=business, name=value)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    "A supplier with this name already exists in this business."
                )
        return value