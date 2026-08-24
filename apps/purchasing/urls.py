from django.urls import path

from apps.purchasing.views import PurchaseOrderDetailView, PurchaseOrderListView

urlpatterns = [
    path("", PurchaseOrderListView.as_view(), name="purchase-order-list"),
    path("<uuid:id>/", PurchaseOrderDetailView.as_view(), name="purchase-order-detail"),
]
