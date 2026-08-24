from django.urls import path

from apps.sales.views import SaleDetailView, SaleListView

urlpatterns = [
    path("", SaleListView.as_view(), name="sale-list"),
    path("<uuid:id>/", SaleDetailView.as_view(), name="sale-detail"),
]
