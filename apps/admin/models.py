import uuid
from django.db import models


class Module(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Module"
        verbose_name_plural = "Modules"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Feature(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey(
        Module,
        on_delete=models.CASCADE,
        related_name="features",
    )
    code = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    is_beta = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Feature"
        verbose_name_plural = "Features"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class PlanFeature(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(
        "billing.Plan",
        on_delete=models.CASCADE,
        related_name="plan_features",
    )
    feature = models.ForeignKey(
        Feature,
        on_delete=models.CASCADE,
        related_name="plan_features",
    )
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Plan Feature"
        verbose_name_plural = "Plan Features"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["plan", "feature"],
                name="unique_plan_feature",
            ),
        ]

    def __str__(self):
        return f"Plan {self.plan_id} -> Feature {self.feature_id} ({self.is_enabled})"


class BusinessFeatureOverride(models.Model):
    class State(models.TextChoices):
        INHERIT = "INHERIT", "Inherit"
        ENABLED = "ENABLED", "Enabled"
        DISABLED = "DISABLED", "Disabled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        "business.Business",
        on_delete=models.CASCADE,
        related_name="feature_overrides",
    )
    feature = models.ForeignKey(
        Feature,
        on_delete=models.CASCADE,
        related_name="business_overrides",
    )
    state = models.CharField(
        max_length=20,
        choices=State.choices,
        default=State.INHERIT,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Business Feature Override"
        verbose_name_plural = "Business Feature Overrides"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "feature"],
                name="unique_business_feature_override",
            ),
        ]

    def __str__(self):
        return f"Business {self.business_id} -> Feature {self.feature_id} ({self.state})"
