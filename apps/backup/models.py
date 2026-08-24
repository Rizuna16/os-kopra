from django.db import models

import uuid


class Backup(models.Model):
    """Platform-level sensitive backup record (PART 26 Backup contract).

    Backup data is platform privileged; never exposed via Business-scoped APIs.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    triggered_by = models.ForeignKey(
        "authentication.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="backups",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=32, default="COMPLETED")
    integrity = models.CharField(max_length=255, blank=True)
    verified = models.BooleanField(default=True)
    restored_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Backup"
        verbose_name_plural = "Backups"

    def __str__(self):
        return f"Backup {self.id} ({self.status})"
