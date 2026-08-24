import uuid

from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """Append-only audit record (Master S11: actor/action/timestamp/business/location).

    Platform-level audit surface consumed only by Super Admin (PART 25 boundary).
    Ordinary Business users never receive cross-business audit access.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    business = models.ForeignKey(
        "business.Business",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    location = models.ForeignKey(
        "business.Location",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    target = models.CharField(max_length=255, blank=True)
    resource = models.CharField(max_length=255, blank=True)
    event_type = models.CharField(max_length=128, blank=True)
    outcome = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
        indexes = [
            models.Index(fields=["event_type"]),
            models.Index(fields=["business"]),
        ]

    def __str__(self):
        return f"{self.action} @ {self.timestamp}"

    def save(self, *args, **kwargs):
        # Append-only: existing records must never be silently modified.
        if self.pk and AuditLog.objects.filter(pk=self.pk).exists():
            raise RuntimeError("AuditLog records are append-only and cannot be modified.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise RuntimeError("AuditLog records cannot be deleted.")
