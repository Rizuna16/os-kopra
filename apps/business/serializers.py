from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.business.models import BusinessMembership, Business, Location, Subscription
from apps.business.services import ONBOARDING_TEMPLATES


class BusinessSerializer(serializers.ModelSerializer):
    owner = serializers.UUIDField(source="owner.id", read_only=True)

    class Meta:
        model = Business
        fields = ["id", "name", "business_type", "owner", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "owner", "status", "created_at", "updated_at"]


class BusinessCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = ["name", "business_type"]

    def validate_business_type(self, value):
        if value and value not in ONBOARDING_TEMPLATES:
            raise serializers.ValidationError(
                f"Invalid business type. Supported types: {', '.join(ONBOARDING_TEMPLATES)}"
            )
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        from django.db import transaction
        with transaction.atomic():
            business = Business.objects.create(owner=user, **validated_data)
            BusinessMembership.objects.create(
                business=business,
                user=user,
                role=BusinessMembership.Role.OWNER,
            )
            Subscription.objects.create(business=business, status=Subscription.Status.TRIAL)
            return business


class LocationSerializer(serializers.ModelSerializer):
    business = serializers.UUIDField(source="business.id", read_only=True)

    class Meta:
        model = Location
        fields = ["id", "business", "name", "created_at", "updated_at"]
        read_only_fields = ["id", "business", "created_at", "updated_at"]


class LocationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ["name"]

    def create(self, validated_data):
        business = self.context["business"]
        return Location.objects.create(business=business, **validated_data)


class SubscriptionSerializer(serializers.ModelSerializer):
    business = serializers.UUIDField(source="business.id", read_only=True)

    class Meta:
        model = Subscription
        fields = ["id", "business", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "business", "status", "created_at", "updated_at"]


class SubscriptionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = []

    def create(self, validated_data):
        business = self.context["business"]
        return Subscription.objects.create(business=business)


class MemberCreateSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    role = serializers.ChoiceField(choices=BusinessMembership.Role.choices, default=BusinessMembership.Role.KASIR)

    def validate_user_id(self, value):
        business = self.context["business"]
        User = get_user_model()
        try:
            user = User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User does not exist.")

        if business.owner_id == user.id:
            raise serializers.ValidationError("Owner cannot be added as a member.")

        if BusinessMembership.objects.filter(business=business, user=user).exists():
            raise serializers.ValidationError("User is already a member of this business.")

        return user

    def create(self, validated_data):
        return BusinessMembership.objects.create(
            business=self.context["business"],
            user=validated_data["user_id"],
            role=validated_data.get("role", BusinessMembership.Role.KASIR),
        )


class UserMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ["id", "email", "first_name", "last_name"]


class MemberSerializer(serializers.ModelSerializer):
    business = serializers.UUIDField(source="business.id", read_only=True)
    user = UserMemberSerializer(read_only=True)

    class Meta:
        model = BusinessMembership
        fields = ["id", "business", "user", "role", "created_at", "updated_at"]
        read_only_fields = ["id", "business", "user", "created_at", "updated_at"]