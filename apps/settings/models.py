import uuid
from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.business.models import Business


class BusinessTaxConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.OneToOneField(Business, on_delete=models.CASCADE, related_name="tax_config")
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    tax_name = models.CharField(max_length=50, default="PPN")
    tax_inclusive = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Business Tax Config"
        verbose_name_plural = "Business Tax Configs"


class BusinessCurrencyConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.OneToOneField(Business, on_delete=models.CASCADE, related_name="currency_config")
    currency_code = models.CharField(max_length=3, default="IDR")
    currency_symbol = models.CharField(max_length=5, default="Rp")
    decimal_places = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(4)]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Business Currency Config"
        verbose_name_plural = "Business Currency Configs"


class BusinessInvoiceConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.OneToOneField(Business, on_delete=models.CASCADE, related_name="invoice_config")
    invoice_prefix = models.CharField(max_length=20, default="INV-")
    invoice_next_number = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)]
    )
    invoice_notes = models.TextField(blank=True, default="")
    invoice_footer = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Business Invoice Config"
        verbose_name_plural = "Business Invoice Configs"


class BusinessReceiptConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.OneToOneField(Business, on_delete=models.CASCADE, related_name="receipt_config")
    receipt_prefix = models.CharField(max_length=20, default="RCT-")
    receipt_next_number = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)]
    )
    receipt_notes = models.TextField(blank=True, default="")
    receipt_footer = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Business Receipt Config"
        verbose_name_plural = "Business Receipt Configs"


class UserNotificationPreference(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_preferences")
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="user_notification_preferences")
    receive_stock_alerts = models.BooleanField(default=True)
    receive_order_alerts = models.BooleanField(default=True)
    receive_payment_alerts = models.BooleanField(default=True)
    receive_subscription_alerts = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Notification Preference"
        verbose_name_plural = "User Notification Preferences"
        constraints = [
            models.UniqueConstraint(fields=["user", "business"], name="unique_user_business_notification_preference")
        ]


class BusinessIntegrationConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.OneToOneField(Business, on_delete=models.CASCADE, related_name="integration_config")
    webhook_url = models.URLField(max_length=500, null=True, blank=True, default=None)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Business Integration Config"
        verbose_name_plural = "Business Integration Configs"
