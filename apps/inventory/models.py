import uuid

from django.db import models

from apps.business.models import Location
from apps.product.models import Variant


class Stock(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name="stocks",
    )
    variant = models.ForeignKey(
        Variant,
        on_delete=models.CASCADE,
        related_name="stocks",
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Stock"
        verbose_name_plural = "Stocks"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["location"]),
            models.Index(fields=["variant"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["variant", "location"],
                name="unique_stock_per_variant_location",
            ),
        ]

    def __str__(self):
        return f"{self.variant.name} @ {self.location.name}"


class Batch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=255)
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name="batches",
    )
    variant = models.ForeignKey(
        Variant,
        on_delete=models.CASCADE,
        related_name="batches",
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    expired_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Batch"
        verbose_name_plural = "Batches"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["location"]),
            models.Index(fields=["variant"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["location", "code"],
                name="unique_batch_per_location_code",
            ),
        ]

    def __str__(self):
        return f"Batch {self.code} ({self.variant.name} @ {self.location.name})"


class SerialNumber(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(
        Batch,
        on_delete=models.CASCADE,
        related_name="serial_numbers",
    )
    serial_number = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Serial Number"
        verbose_name_plural = "Serial Numbers"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["batch"]),
        ]

    def __str__(self):
        return f"SN {self.serial_number} (Batch {self.batch.code})"
