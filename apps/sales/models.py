import uuid

from django.conf import settings
from django.db import models

from apps.business.models import Business, Location
from apps.customer.models import Customer
from apps.product.models import Variant


class CashierShift(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        CLOSED = "CLOSED", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="shifts",
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name="shifts",
    )
    cashier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shifts",
    )
    modal_awal = models.DecimalField(max_digits=12, decimal_places=2)
    uang_tunai_aktual = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    selisih_kas = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Cashier Shift"
        verbose_name_plural = "Cashier Shifts"
        ordering = ["-opened_at"]
        indexes = [
            models.Index(fields=["business"]),
            models.Index(fields=["location"]),
            models.Index(fields=["cashier"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"Shift {self.id} ({self.status})"


class Sale(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        COMPLETED = "COMPLETED", "Completed"
        VOIDED = "VOIDED", "Voided"

    # HELD is intentionally NOT part of the canonical Sale.Status field choices.
    # It is a Kasir-only operational state defined at the serializer layer so
    # that the shared Sale model remains backward-compatible with locked
    # Part 12 / Part 22 contracts (which assert Status == DRAFT/COMPLETED/VOIDED).
    HELD_STATUS = "HELD"

    class PaymentMethod(models.TextChoices):
        CASH = "CASH", "Cash"
        QRIS = "QRIS", "QRIS"
        TRANSFER = "TRANSFER", "Transfer"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="sales",
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name="sales",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales",
    )
    loyalty_earned = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        null=True,
        blank=True,
    )
    shift = models.ForeignKey(
        CashierShift,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Sale"
        verbose_name_plural = "Sales"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business"]),
            models.Index(fields=["business", "status"]),
            models.Index(fields=["location"]),
        ]

    def __str__(self):
        return f"Sale {self.id} ({self.status})"


class SaleLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(
        Sale,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    variant = models.ForeignKey(
        Variant,
        on_delete=models.CASCADE,
        related_name="sale_lines",
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    applied_promotion = models.ForeignKey(
        "promotion_loyalty.Promotion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sale_lines",
    )
    applied_discount_type = models.CharField(max_length=20, blank=True, null=True)
    applied_discount_value = models.DecimalField(
        max_digits=12, decimal_places=2, blank=True, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Sale Line"
        verbose_name_plural = "Sale Lines"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["sale"]),
            models.Index(fields=["variant"]),
            models.Index(fields=["applied_promotion"]),
        ]

    def __str__(self):
        return f"Line {self.id} ({self.variant.name})"
