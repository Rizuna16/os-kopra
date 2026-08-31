from rest_framework import serializers

from apps.billing.models import Payment, Plan


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ["id", "name", "code", "amount", "currency", "billing_interval"]
        read_only_fields = fields


class PaymentCreateSerializer(serializers.Serializer):
    subscription_id = serializers.UUIDField()
    plan_id = serializers.UUIDField()
    purpose = serializers.ChoiceField(
        choices=Payment.Purpose.choices,
        default=Payment.Purpose.INITIAL,
        required=False,
    )

    def validate(self, attrs):
        for forbidden in ("amount", "currency", "status", "provider_reference", "paid_at"):
            if forbidden in self.initial_data:
                raise serializers.ValidationError(
                    {forbidden: "This field must not be provided by the client."}
                )
        if "purpose" in self.initial_data and self.initial_data.get("purpose") not in (
            Payment.Purpose.INITIAL,
            Payment.Purpose.RENEWAL,
            Payment.Purpose.UPGRADE,
        ):
            raise serializers.ValidationError({"purpose": "Invalid purpose value."})
        return attrs


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "subscription",
            "plan",
            "amount",
            "currency",
            "status",
            "provider",
            "provider_reference",
            "paid_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
