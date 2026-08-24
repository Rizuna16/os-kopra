from django.contrib import admin

from apps.billing.models import Payment, PaymentWebhookEvent, Plan


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "amount", "currency", "billing_interval", "is_active")
    list_filter = ("is_active", "billing_interval", "currency")
    search_fields = ("name", "code")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "subscription", "plan", "amount", "currency", "status", "provider")
    list_filter = ("status", "provider", "currency")
    search_fields = ("id", "provider_reference")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(PaymentWebhookEvent)
class PaymentWebhookEventAdmin(admin.ModelAdmin):
    list_display = ("id", "provider", "event_id", "payment", "processed", "created_at")
    list_filter = ("provider", "processed")
    search_fields = ("event_id",)
    readonly_fields = ("id", "created_at", "payload")