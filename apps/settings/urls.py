from django.urls import path
from apps.settings.views import (
    BusinessSettingsView,
    BusinessTaxConfigView,
    BusinessCurrencyConfigView,
    BusinessInvoiceConfigView,
    BusinessReceiptConfigView,
    UserNotificationPreferenceView,
    BusinessIntegrationConfigView,
)

app_name = "settings"

urlpatterns = [
    path("business/", BusinessSettingsView.as_view(), name="business-settings"),
    path("tax/", BusinessTaxConfigView.as_view(), name="tax-settings"),
    path("currency/", BusinessCurrencyConfigView.as_view(), name="currency-settings"),
    path("invoice/", BusinessInvoiceConfigView.as_view(), name="invoice-settings"),
    path("receipt/", BusinessReceiptConfigView.as_view(), name="receipt-settings"),
    path("notifications/", UserNotificationPreferenceView.as_view(), name="notification-settings"),
    path("integration/", BusinessIntegrationConfigView.as_view(), name="integration-settings"),
]
