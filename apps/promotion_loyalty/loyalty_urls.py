from django.urls import path

from apps.promotion_loyalty.views import (
    CustomerLoyaltyRecordDetailView,
    CustomerLoyaltyRecordListView,
    LoyaltyProgramDetailView,
    LoyaltyProgramListView,
)

urlpatterns = [
    path(
        "",
        LoyaltyProgramListView.as_view(),
        name="loyalty-program-list",
    ),
    path(
        "<uuid:id>/",
        LoyaltyProgramDetailView.as_view(),
        name="loyalty-program-detail",
    ),
    path(
        "<uuid:program_id>/customers/",
        CustomerLoyaltyRecordListView.as_view(),
        name="customer-loyalty-record-list",
    ),
    path(
        "<uuid:program_id>/customers/<uuid:id>/",
        CustomerLoyaltyRecordDetailView.as_view(),
        name="customer-loyalty-record-detail",
    ),
]
