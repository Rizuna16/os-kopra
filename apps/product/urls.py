from django.urls import path

from apps.product.views import (
    ProductCreateView,
    ProductDetailView,
    VariantCreateView,
    VariantDetailView,
)

app_name = "product"

urlpatterns = [
    path("", ProductCreateView.as_view(), name="product-create"),
    path(
        "<uuid:product_id>/",
        ProductDetailView.as_view(),
        name="product-detail",
    ),
    path(
        "<uuid:product_id>/variants/",
        VariantCreateView.as_view(),
        name="variant-create",
    ),
    path(
        "<uuid:product_id>/variants/<uuid:variant_id>/",
        VariantDetailView.as_view(),
        name="variant-detail",
    ),
]
