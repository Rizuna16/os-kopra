from django.apps import AppConfig


class SecurityConfig(AppConfig):
    # Test-only package marker; no production models/views/migrations.
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.security"
