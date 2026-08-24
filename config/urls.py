from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from apps.inventory.views import (
    StockAdjustmentView,
    StockDetailView,
    StockOpnameView,
    StockTransferView,
)
from apps.onlinestore.views import (
    CartView,
    CheckoutView,
    OnlineOrderViewSet,
    PublicCatalogView,
    PublicStoreView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.authentication.urls")),
    path(
        "api/v1/businesses/<uuid:business_id>/products/",
        include("apps.product.urls"),
    ),
    path(
        "api/v1/businesses/<uuid:business_id>/locations/<uuid:location_id>/stocks/",
        include("apps.inventory.urls"),
    ),
    path("api/v1/businesses/", include("apps.business.urls")),
    path(
        "api/v1/businesses/<uuid:business_id>/suppliers/",
        include("apps.supplier.urls"),
    ),
    path(
        "api/v1/businesses/<uuid:business_id>/purchase-orders/",
        include("apps.purchasing.urls"),
    ),
    path(
        "api/v1/businesses/<uuid:business_id>/sales/",
        include("apps.sales.urls"),
    ),
    path(
        "api/v1/businesses/<uuid:business_id>/customers/",
        include("apps.customer.urls"),
    ),
    path(
        "api/v1/businesses/<uuid:business_id>/promotions/",
        include("apps.promotion_loyalty.urls"),
    ),
    path(
        "api/v1/businesses/<uuid:business_id>/loyalty-programs/",
        include("apps.promotion_loyalty.loyalty_urls"),
    ),
    path("api/v1/billing/", include("apps.billing.urls")),
    path(
        "api/v1/businesses/<uuid:business_id>/",
        include("apps.onlinestore.urls"),
    ),
    path("api/v1/ai/", include("apps.ai.urls")),
    path("api/v1/admin/", include("apps.admin.urls")),
    path("api/v1/admin/audit-logs/", include("apps.audit.urls")),
    path("api/v1/admin/backups/", include("apps.backup.urls")),
    path("api/v1/admin/monitoring/", include("apps.monitoring.urls")),
    path("api/v1/stores/<slug:slug>/", PublicStoreView.as_view(), name="public-store"),
    path("api/v1/stores/<slug:slug>/products/", PublicCatalogView.as_view(), name="public-catalog"),
    path("api/v1/stores/<slug:slug>/cart/", CartView.as_view(), name="public-cart"),
    path("api/v1/stores/<slug:slug>/checkout/", CheckoutView.as_view(), name="public-checkout"),
    path("api/v1/stores/<slug:slug>/orders/", OnlineOrderViewSet.as_view({"get": "list"}), name="public-order-list"),
    path(
        "api/v1/businesses/<uuid:business_id>/accounts/",
        include("apps.finance.urls"),
    ),
    path(
        "api/v1/businesses/<uuid:business_id>/journals/",
        include("apps.finance.journal_urls"),
    ),
    path(
        "api/v1/businesses/<uuid:business_id>/ledgers/",
        include("apps.finance.ledger_urls"),
    ),
    path(
        "api/v1/businesses/<uuid:business_id>/expenses/",
        include("apps.finance.expense_urls"),
    ),
    path(
        "api/v1/businesses/<uuid:business_id>/employees/",
        include("apps.employee.urls"),
    ),
    path(
        "api/v1/businesses/<uuid:business_id>/reports/",
        include("apps.reports.urls"),
    ),
    path(
        "api/v1/businesses/<uuid:business_id>/notifications/",
        include("apps.notification.urls"),
    ),
    path("api/stocks/<uuid:id>/", StockDetailView.as_view(), name="stock-detail"),
    path(
        "api/v1/stocks/transfer/", StockTransferView.as_view(), name="stock-transfer"
    ),
    path(
        "api/v1/stocks/adjustment/",
        StockAdjustmentView.as_view(),
        name="stock-adjustment",
    ),
    path(
        "api/v1/stocks/opname/",
        StockOpnameView.as_view(),
        name="stock-opname",
    ),
    path(
        "api/v1/inventory/batches/",
        include("apps.inventory.batch_urls"),
    ),
    path(
        "api/v1/inventory/serial-numbers/",
        include("apps.inventory.serial_urls"),
    ),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/v1/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
