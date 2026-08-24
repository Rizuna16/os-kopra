from django.contrib import admin

from apps.inventory.models import Stock


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ["id", "variant", "location", "quantity", "created_at"]
    list_filter = ["location__business", "created_at"]
    readonly_fields = ["id", "created_at", "updated_at"]
