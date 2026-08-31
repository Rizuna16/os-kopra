from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("business", "0009_business_business_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="business",
            name="brand_color",
            field=models.CharField(blank=True, default=None, max_length=7, null=True),
        ),
        migrations.AddField(
            model_name="business",
            name="logo_url",
            field=models.URLField(blank=True, default=None, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name="business",
            name="tagline",
            field=models.CharField(blank=True, default=None, max_length=255, null=True),
        ),
    ]
