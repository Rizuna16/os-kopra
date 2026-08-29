from rest_framework import serializers

from apps.admin.models import Module, Feature, PlanFeature, BusinessFeatureOverride
from apps.billing.models import Plan
from apps.business.models import Business


class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = [
            "id",
            "code",
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = [
            "id",
            "module",
            "code",
            "name",
            "description",
            "is_active",
            "is_beta",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PlanFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanFeature
        fields = [
            "id",
            "plan",
            "feature",
            "is_enabled",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class BusinessFeatureOverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessFeatureOverride
        fields = [
            "id",
            "business",
            "feature",
            "state",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
