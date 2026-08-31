from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.authentication.permissions import BusinessAccessMixin
from apps.settings.models import (
    BusinessTaxConfig,
    BusinessCurrencyConfig,
    BusinessInvoiceConfig,
    BusinessReceiptConfig,
    UserNotificationPreference,
    BusinessIntegrationConfig,
)
from apps.settings.serializers import (
    BusinessSettingsSerializer,
    BusinessTaxConfigSerializer,
    BusinessCurrencyConfigSerializer,
    BusinessInvoiceConfigSerializer,
    BusinessReceiptConfigSerializer,
    UserNotificationPreferenceSerializer,
    BusinessIntegrationConfigSerializer,
)


class BusinessSettingsView(APIView, BusinessAccessMixin):
    def get(self, request, business_id):
        self.require_business_permission("settings", "view")
        business = self.get_business()
        serializer = BusinessSettingsSerializer(business)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, business_id):
        self.require_business_permission("settings", "update")
        business = self.get_business()
        serializer = BusinessSettingsSerializer(business, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class BusinessTaxConfigView(APIView, BusinessAccessMixin):
    def get(self, request, business_id):
        self.require_business_permission("settings", "view")
        business = self.get_business()
        config, _ = BusinessTaxConfig.objects.get_or_create(
            business=business,
            defaults={"tax_rate": 0, "tax_name": "PPN", "tax_inclusive": False}
        )
        serializer = BusinessTaxConfigSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, business_id):
        self.require_business_permission("settings", "update")
        business = self.get_business()
        config, _ = BusinessTaxConfig.objects.get_or_create(
            business=business,
            defaults={"tax_rate": 0, "tax_name": "PPN", "tax_inclusive": False}
        )
        serializer = BusinessTaxConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class BusinessCurrencyConfigView(APIView, BusinessAccessMixin):
    def get(self, request, business_id):
        self.require_business_permission("settings", "view")
        business = self.get_business()
        config, _ = BusinessCurrencyConfig.objects.get_or_create(
            business=business,
            defaults={"currency_code": "IDR", "currency_symbol": "Rp", "decimal_places": 0}
        )
        serializer = BusinessCurrencyConfigSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, business_id):
        self.require_business_permission("settings", "update")
        business = self.get_business()
        config, _ = BusinessCurrencyConfig.objects.get_or_create(
            business=business,
            defaults={"currency_code": "IDR", "currency_symbol": "Rp", "decimal_places": 0}
        )
        serializer = BusinessCurrencyConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class BusinessInvoiceConfigView(APIView, BusinessAccessMixin):
    def get(self, request, business_id):
        self.require_business_permission("settings", "view")
        business = self.get_business()
        config, _ = BusinessInvoiceConfig.objects.get_or_create(
            business=business,
            defaults={"invoice_prefix": "INV-", "invoice_next_number": 1, "invoice_notes": "", "invoice_footer": ""}
        )
        serializer = BusinessInvoiceConfigSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, business_id):
        self.require_business_permission("settings", "update")
        business = self.get_business()
        config, _ = BusinessInvoiceConfig.objects.get_or_create(
            business=business,
            defaults={"invoice_prefix": "INV-", "invoice_next_number": 1, "invoice_notes": "", "invoice_footer": ""}
        )
        serializer = BusinessInvoiceConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class BusinessReceiptConfigView(APIView, BusinessAccessMixin):
    def get(self, request, business_id):
        self.require_business_permission("settings", "view")
        business = self.get_business()
        config, _ = BusinessReceiptConfig.objects.get_or_create(
            business=business,
            defaults={"receipt_prefix": "RCT-", "receipt_next_number": 1, "receipt_notes": "", "receipt_footer": ""}
        )
        serializer = BusinessReceiptConfigSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, business_id):
        self.require_business_permission("settings", "update")
        business = self.get_business()
        config, _ = BusinessReceiptConfig.objects.get_or_create(
            business=business,
            defaults={"receipt_prefix": "RCT-", "receipt_next_number": 1, "receipt_notes": "", "receipt_footer": ""}
        )
        serializer = BusinessReceiptConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserNotificationPreferenceView(APIView, BusinessAccessMixin):
    def get(self, request, business_id):
        self.require_business_permission("settings", "view")
        business = self.get_business()
        pref, _ = UserNotificationPreference.objects.get_or_create(
            user=request.user,
            business=business,
            defaults={
                "receive_stock_alerts": True,
                "receive_order_alerts": True,
                "receive_payment_alerts": True,
                "receive_subscription_alerts": True,
            }
        )
        serializer = UserNotificationPreferenceSerializer(pref)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, business_id):
        self.require_business_permission("settings", "update")
        business = self.get_business()
        pref, _ = UserNotificationPreference.objects.get_or_create(
            user=request.user,
            business=business,
            defaults={
                "receive_stock_alerts": True,
                "receive_order_alerts": True,
                "receive_payment_alerts": True,
                "receive_subscription_alerts": True,
            }
        )
        serializer = UserNotificationPreferenceSerializer(pref, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class BusinessIntegrationConfigView(APIView, BusinessAccessMixin):
    def get(self, request, business_id):
        self.require_business_permission("settings", "view")
        business = self.get_business()
        config, _ = BusinessIntegrationConfig.objects.get_or_create(
            business=business,
            defaults={"webhook_url": None}
        )
        serializer = BusinessIntegrationConfigSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, business_id):
        self.require_business_permission("settings", "update")
        business = self.get_business()
        config, _ = BusinessIntegrationConfig.objects.get_or_create(
            business=business,
            defaults={"webhook_url": None}
        )
        serializer = BusinessIntegrationConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
