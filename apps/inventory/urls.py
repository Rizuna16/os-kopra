from django.urls import path

from apps.inventory.views import StockCreateView

app_name = "inventory"

urlpatterns = [
    path("", StockCreateView.as_view(), name="stock-create"),
]
