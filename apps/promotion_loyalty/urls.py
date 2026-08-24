from django.urls import path

from apps.promotion_loyalty.views import (
    PromotionDetailView,
    PromotionListView,
)

urlpatterns = [
    path("", PromotionListView.as_view(), name="promotion-list"),
    path("<uuid:id>/", PromotionDetailView.as_view(), name="promotion-detail"),
]
