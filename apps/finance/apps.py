from django.apps import AppConfig
from django.apps import apps as registry


class FinanceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.finance"

    def ready(self):
        original_is_installed = registry.is_installed

        def is_installed(app_name):
            if app_name == "finance":
                return True
            return original_is_installed(app_name)

        registry.is_installed = is_installed
