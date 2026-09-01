from django.urls import path

from apps.reports.views import (
    FinanceReportView,
    InventoryReportView,
    OverviewView,
    PurchasingReportView,
    ProductReportView,
    SalesReportView,
    CustomerReportView,
    SupplierReportView,
    PromotionReportView,
    EmployeeReportView,
    ExportReportView,
)

urlpatterns = [
    path("overview/", OverviewView.as_view(), name="reports-overview"),
    path("sales/", SalesReportView.as_view(), name="reports-sales"),
    path("purchasing/", PurchasingReportView.as_view(), name="reports-purchasing"),
    path("finance/", FinanceReportView.as_view(), name="reports-finance"),
    path("inventory/", InventoryReportView.as_view(), name="reports-inventory"),
    path("product/", ProductReportView.as_view(), name="reports-product"),
    path("customer/", CustomerReportView.as_view(), name="reports-customer"),
    path("supplier/", SupplierReportView.as_view(), name="reports-supplier"),
    path("promotion/", PromotionReportView.as_view(), name="reports-promotion"),
    path("employee/", EmployeeReportView.as_view(), name="reports-employee"),
    path("export/<str:report_type>/<str:fmt>/", ExportReportView.as_view(), name="reports-export"),
]
