from django.urls import path

from apps.reports.views import (
    FinanceReportView,
    OverviewView,
    PurchasingReportView,
    SalesReportView,
    InventoryReportView,
)

urlpatterns = [
    path("overview/", OverviewView.as_view(), name="reports-overview"),
    path("sales/", SalesReportView.as_view(), name="reports-sales"),
    path("purchasing/", PurchasingReportView.as_view(), name="reports-purchasing"),
    path("finance/", FinanceReportView.as_view(), name="reports-finance"),
    path("inventory/", InventoryReportView.as_view(), name="reports-inventory"),
]
