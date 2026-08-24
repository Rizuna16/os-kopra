from django.urls import path

from apps.billing.views import MidtransWebhookView, PaymentCreateView, PlanListView

urlpatterns = [
    path("plans/", PlanListView.as_view(), name="plan-list"),
    path("payments/", PaymentCreateView.as_view(), name="payment-create"),
    path("webhooks/midtrans/", MidtransWebhookView.as_view(), name="midtrans-webhook"),
]