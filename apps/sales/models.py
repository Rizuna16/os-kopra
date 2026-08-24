import uuid

from django.db import models

from apps.business.models import Business, Location
from apps.customer.models import Customer
from apps.product.models import Variant


class Sale(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        COMPLETED = "COMPLETED", "Completed"
        VOIDED = "VOIDED", "Voided"

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
