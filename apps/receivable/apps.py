from django.apps import AppConfig


class ReceivableConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.receivable"
    verbose_name = "Receivable"

    def ready(self):
        try:
            from django.apps import apps
            Sale = apps.get_model("sales.Sale")
            if Sale:
                from apps.receivable.signals import connect_signals
                connect_signals(Sale)
        except Exception:
            pass
