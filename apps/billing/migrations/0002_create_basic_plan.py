from decimal import Decimal

from django.db import migrations


def forwards(apps, schema_editor):
    Plan = apps.get_model("billing", "Plan")
    Plan.objects.get_or_create(
        code="basic",
        defaults={
            "name": "Basic",
            "amount": Decimal("99000.00"),
            "currency": "IDR",
            "billing_interval": "MONTHLY",
            "is_active": True,
        },
    )


def backwards(apps, schema_editor):
    Plan = apps.get_model("billing", "Plan")
    Plan.objects.filter(code="basic").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("billing", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
