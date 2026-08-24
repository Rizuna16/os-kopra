import uuid

from django.db import models

from apps.business.models import Business
from apps.customer.models import Customer


class Promotion(models.Model):
    class DiscountType(models.TextChoices):
        PERCENTAGE = "PERCENTAGE", "Percentage"
        FIXED = "FIXED", "Fixed"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    class Applicability(models.TextChoices):
        BUSINESS_WIDE = "BUSINESS_WIDE", "Business-wide"
        PRODUCT_VARIANT = "PRODUCT_VARIANT", "Product/Variant targeted"

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="promotions",
    )
    name = models.CharField(max_length=255)
    discount_type = models.CharField(
        max_length=20, choices=DiscountType.choices
    )
    discount_value = models.DecimalField(max_digits=12, decimal_places=2)
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    applicability = models.CharField(
        max_length=30, choices=Applicability.choices, default=Applicability.BUSINESS_WIDE
    )
    target_product = models.ForeignKey(
        "product.Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="promotions",
    )
    target_variant = models.ForeignKey(
        "product.Variant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="promotions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Promotion"
        verbose_name_plural = "Promotions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business"]),
            models.Index(fields=["status", "applicability"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.discount_type} {self.discount_value})"


class LoyaltyProgram(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="loyalty_programs",
    )
    name = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Loyalty Program"
        verbose_name_plural = "Loyalty Programs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.status})"


class CustomerLoyaltyRecord(models.Model):
    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    program = models.ForeignKey(
        LoyaltyProgram,
        on_delete=models.CASCADE,
        related_name="records",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="loyalty_records",
    )
    points_balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Customer Loyalty Record"
        verbose_name_plural = "Customer Loyalty Records"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["program", "customer"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["program", "customer"],
                name="unique_program_customer_loyalty_record",
            )
        ]

    def __str__(self):
        return f"{self.customer.email} - {self.program.name} ({self.points_balance})"