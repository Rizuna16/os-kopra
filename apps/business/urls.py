from django.urls import path

from apps.business.views import (
    BusinessCreateView,
    LocationCreateView,
    LocationDetailView,
    MemberDeleteView,
    MemberListCreateView,
    SubscriptionCreateView,
)

urlpatterns = [
    path("", BusinessCreateView.as_view(), name="business-create"),
    path(
        "<uuid:business_id>/locations/",
        LocationCreateView.as_view(),
        name="location-create",
    ),
    path(
        "<uuid:business_id>/locations/<uuid:id>/",
        LocationDetailView.as_view(),
        name="location-detail",
    ),
    path(
        "<uuid:business_id>/subscription/",
        SubscriptionCreateView.as_view(),
        name="subscription-create",
    ),
    path(
        "<uuid:business_id>/members/",
        MemberListCreateView.as_view(),
        name="member-list-create",
    ),
    path(
        "<uuid:business_id>/members/<uuid:user_id>/",
        MemberDeleteView.as_view(),
        name="member-delete",
    ),
]