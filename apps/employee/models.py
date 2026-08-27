import uuid

from django.conf import settings
from django.db import models

from apps.business.models import Business


class Employee(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="employees",
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_profile",
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, null=True, blank=True)
    hire_date = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Employee"
        verbose_name_plural = "Employees"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "code"],
                name="uniq_employee_business_code",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.code or '-'})"
