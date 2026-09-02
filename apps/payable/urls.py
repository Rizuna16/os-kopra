from django.urls import path

from apps.payable.views import (
    PayableListView,
    PayableDetailView,
    PayablePayView,
    PayablePaymentReverseView,
    PayableCloseView,
    UtangReportView,
)

urlpatterns = [
    path("", PayableListView.as_view(), name="payable-list"),
    path("reports/", UtangReportView.as_view(), name="payable-reports"),
    path("<uuid:id>/", PayableDetailView.as_view(), name="payable-detail"),
    path("<uuid:id>/pay/", PayablePayView.as_view(), name="payable-pay"),
    path("<uuid:id>/payments/<uuid:payment_id>/reverse/", PayablePaymentReverseView.as_view(), name="payable-payment-reverse"),
    path("<uuid:id>/close/", PayableCloseView.as_view(), name="payable-close"),
]
