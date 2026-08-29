import uuid
from django.conf import settings
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


class SupportTicket(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.OPEN)
    priority = models.CharField(max_length=32, choices=Priority.choices, default=Priority.MEDIUM)
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="support_tickets",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_tickets",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Support Ticket"
        verbose_name_plural = "Support Tickets"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Ticket {self.id} - {self.subject} ({self.status})"


class TicketReply(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name="replies",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ticket_replies",
    )
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Ticket Reply"
        verbose_name_plural = "Ticket Replies"
        ordering = ["created_at"]

    def __str__(self):
        return f"Reply by {self.author_id} on {self.ticket_id}"
