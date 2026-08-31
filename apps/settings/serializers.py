import re
from rest_framework import serializers
from apps.business.models import Business
from apps.settings.models import (
    BusinessTaxConfig,
    BusinessCurrencyConfig,
    BusinessInvoiceConfig,
    BusinessReceiptConfig,
    UserNotificationPreference,
    BusinessIntegrationConfig,
)


class BusinessSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = [
            "id",
            "name",
            "business_type",
            "logo_url",
            "brand_color",
            "tagline",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business_type",
            "status",
            "created_at",
            "updated_at",
        ]

    def validate_brand_color(self, value):
        if value in (None, ""):
            return value
        if not re.match(r"^#[0-9A-Fa-f]{6}$", value):
            raise serializers.ValidationError("Brand color must be a valid hex color (e.g. #RRGGBB).")
        return value

    def validate_logo_url(self, value):
        if value in (None, ""):
            return None
        return value

    def validate_tagline(self, value):
        if value is not None and len(value) > 255:
            raise serializers.ValidationError("Tagline cannot exceed 255 characters.")
        return value


class BusinessTaxConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessTaxConfig
        fields = [
            "id",
            "business",
            "tax_rate",
            "tax_name",
            "tax_inclusive",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "business", "created_at", "updated_at"]

    def validate_tax_rate(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Tax rate must be between 0 and 100.")
        return value

    def validate_tax_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Tax name cannot be empty.")
        return value


class BusinessCurrencyConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessCurrencyConfig
        fields = [
            "id",
            "business",
            "currency_code",
            "currency_symbol",
            "decimal_places",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "business", "created_at", "updated_at"]

    def validate_currency_code(self, value):
        if not value or len(value) != 3 or not value.isalpha():
            raise serializers.ValidationError("Currency code must be a valid 3-letter ISO 4217 code.")
        return value.upper()

    def validate_decimal_places(self, value):
        if value < 0 or value > 4:
            raise serializers.ValidationError("Decimal places must be between 0 and 4.")
        return value


class BusinessInvoiceConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessInvoiceConfig
        fields = [
            "id",
            "business",
            "invoice_prefix",
            "invoice_next_number",
            "invoice_notes",
            "invoice_footer",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "business", "created_at", "updated_at"]

    def validate_invoice_prefix(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Invoice prefix cannot be empty.")
        return value

    def validate_invoice_next_number(self, value):
        if value < 1:
            raise serializers.ValidationError("Invoice next number must be at least 1.")
        return value


class BusinessReceiptConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessReceiptConfig
        fields = [
            "id",
            "business",
            "receipt_prefix",
            "receipt_next_number",
            "receipt_notes",
            "receipt_footer",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "business", "created_at", "updated_at"]

    def validate_receipt_prefix(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Receipt prefix cannot be empty.")
        return value

    def validate_receipt_next_number(self, value):
        if value < 1:
            raise serializers.ValidationError("Receipt next number must be at least 1.")
        return value


class UserNotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNotificationPreference
        fields = [
            "id",
            "user",
            "business",
            "receive_stock_alerts",
            "receive_order_alerts",
            "receive_payment_alerts",
            "receive_subscription_alerts",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "business", "created_at", "updated_at"]


class BusinessIntegrationConfigSerializer(serializers.ModelSerializer):
    storefront_url = serializers.SerializerMethodField()
    api_docs_url = serializers.SerializerMethodField()

    class Meta:
        model = BusinessIntegrationConfig
        fields = [
            "id",
            "business",
            "storefront_url",
            "webhook_url",
            "api_docs_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "business", "storefront_url", "api_docs_url", "created_at", "updated_at"]

    def get_storefront_url(self, obj):
        try:
            store = obj.business.online_stores.first()
            if store and store.slug:
                return f"/store/{store.slug}/"
        except Exception:
            pass
        return None

    def get_api_docs_url(self, obj):
        return "/api/v1/docs/"

    def validate_webhook_url(self, value):
        if value in (None, ""):
            return None
        return value
