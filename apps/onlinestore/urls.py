from django.urls import path

from apps.onlinestore.views import (
    OnlineOrderStatusView,
    OnlineOrderViewSet,
    OnlineStoreProductViewSet,
    OnlineStoreViewSet,
)

app_name = "onlinestore"

urlpatterns = [
    # Owner endpoints
    path(
        "online-stores/",
        OnlineStoreViewSet.as_view({"get": "list", "post": "create"}),
        name="online-store-list",
    ),
    path(
        "online-stores/<uuid:pk>/",
        OnlineStoreViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}),
        name="online-store-detail",
    ),
    path(
        "online-stores/<uuid:store_id>/products/",
        OnlineStoreProductViewSet.as_view({"get": "list", "post": "create"}),
        name="online-store-product-list",
    ),
    path(
        "online-stores/<uuid:store_id>/products/<uuid:pk>/",
        OnlineStoreProductViewSet.as_view({"patch": "partial_update"}),
        name="online-store-product-detail",
    ),
    path(
        "online-stores/<uuid:store_id>/orders/",
        OnlineOrderViewSet.as_view({"get": "list"}),
        name="online-store-orders-list",
    ),
]
