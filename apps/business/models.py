import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Business(models.Model):
    class Status(models.TextChoices):
        ONBOARDING = "ONBOARDING", "Onboarding"
        ACTIVE = "ACTIVE", "Active"
        SUSPENDED = "SUSPENDED", "Suspended"
        CLOSED = "CLOSED", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    business_type = models.CharField(max_length=100, blank=True, default="Usaha Lainnya")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="businesses",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ONBOARDING,
    )
    logo_url = models.URLField(max_length=500, null=True, blank=True, default=None)
    brand_color = models.CharField(max_length=7, null=True, blank=True, default=None)
    tagline = models.CharField(max_length=255, null=True, blank=True, default=None)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Business"
        verbose_name_plural = "Businesses"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "status"]),
        ]

    def __str__(self):
        return self.name


class Location(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="locations",
    )
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Location"
        verbose_name_plural = "Locations"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.business.name})"


class Subscription(models.Model):
    class Status(models.TextChoices):
        TRIAL = "TRIAL", "Trial"
        ONBOARDING = "ONBOARDING", "Onboarding"
        ACTIVE = "ACTIVE", "Active"
        SUSPENDED = "SUSPENDED", "Suspended"
        EXPIRED = "EXPIRED", "Expired"
        CANCELED = "CANCELED", "Canceled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TRIAL,
    )
    plan = models.ForeignKey(
        "billing.Plan",
        on_delete=models.PROTECT,
        blank=True,
        null=True,
    )
    period_start = models.DateTimeField(blank=True, null=True)
    period_end = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Subscription"
        verbose_name_plural = "Subscriptions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business", "status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["business"],
                condition=models.Q(status__in=["TRIAL", "ONBOARDING", "ACTIVE"]),
                name="unique_active_subscription_per_business",
            ),
        ]

    def __str__(self):
        return f"{self.business.name} - {self.status}"


class BusinessMembership(models.Model):
    class Role(models.TextChoices):
        OWNER = "OWNER", "Owner"
        ADMIN = "ADMIN", "Admin"
        KASIR = "KASIR", "Kasir"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="business_memberships",
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.KASIR,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Business Membership"
        verbose_name_plural = "Business Memberships"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "user"],
                name="unique_membership_per_business_user",
            ),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.business.name}"