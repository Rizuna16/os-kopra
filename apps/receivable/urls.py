from django.urls import path

from apps.receivable.views import (
    ReceivableListView,
    ReceivableDetailView,
    ReceivablePayView,
    ReceivablePaymentReverseView,
    ReceivableCloseView,
    PiutangReportView,
)

urlpatterns = [
    path("", ReceivableListView.as_view(), name="receivable-list"),
    path("reports/", PiutangReportView.as_view(), name="receivable-reports"),
    path("<uuid:id>/", ReceivableDetailView.as_view(), name="receivable-detail"),
    path("<uuid:id>/pay/", ReceivablePayView.as_view(), name="receivable-pay"),
    path("<uuid:id>/payments/<uuid:payment_id>/reverse/", ReceivablePaymentReverseView.as_view(), name="receivable-payment-reverse"),
    path("<uuid:id>/close/", ReceivableCloseView.as_view(), name="receivable-close"),
]
