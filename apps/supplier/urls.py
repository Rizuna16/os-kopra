from django.urls import path

from apps.supplier.views import SupplierDetailView, SupplierListView

urlpatterns = [
    path("", SupplierListView.as_view(), name="supplier-list"),
    path("<uuid:id>/", SupplierDetailView.as_view(), name="supplier-detail"),
]