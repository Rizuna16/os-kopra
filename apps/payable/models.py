import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.business.models import Business, Location
from apps.purchasing.models import PurchaseOrder
from apps.supplier.models import Supplier


class Payable(models.Model):
    class Status(models.TextChoices):
        UNPAID = "UNPAID", "Unpaid"
        PARTIAL = "PARTIAL", "Partial"
        PAID = "PAID", "Paid"
        VOIDED = "VOIDED", "Voided"
        CLOSED = "CLOSED", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="payables",
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="payables",
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="payables",
    )
    purchase_order = models.OneToOneField(
        PurchaseOrder,
        on_delete=models.PROTECT,
        related_name="payable",
    )
    invoice_number = models.CharField(max_length=100)
    original_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    outstanding_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.UNPAID,
    )
    due_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Payable"
        verbose_name_plural = "Payables"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "invoice_number"],
                name="unique_payable_invoice_per_business",
            )
        ]
        indexes = [
            models.Index(fields=["business"]),
            models.Index(fields=["location"]),
            models.Index(fields=["supplier"]),
            models.Index(fields=["status"]),
            models.Index(fields=["due_date"]),
        ]

    def __str__(self):
        return f"Payable {self.invoice_number} - {self.supplier.name} ({self.status})"


class SupplierPaymentAllocation(models.Model):
    class PaymentMethod(models.TextChoices):
        CASH = "CASH", "Cash"
        QRIS = "QRIS", "QRIS"
        TRANSFER = "TRANSFER", "Transfer"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="supplier_payment_allocations",
    )
    payable = models.ForeignKey(
        Payable,
        on_delete=models.PROTECT,
        related_name="allocations",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
    )
    payment_date = models.DateTimeField(default=timezone.now)
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    is_reversed = models.BooleanField(default=False)
    reversed_at = models.DateTimeField(null=True, blank=True)
    reversed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reversed_supplier_payments",
    )
    reversal_reason = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_supplier_payments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Supplier Payment Allocation"
        verbose_name_plural = "Supplier Payment Allocations"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business"]),
            models.Index(fields=["payable"]),
            models.Index(fields=["is_reversed"]),
        ]

    def __str__(self):
        return f"Supplier Payment {self.amount} for Payable {self.payable.invoice_number}"
