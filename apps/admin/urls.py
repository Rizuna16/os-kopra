from django.urls import path

from apps.admin.views import (
    AdminAccountListView,
    AdminAccountDetailView,
    AdminOwnerListView,
    AdminOwnerDetailView,
    AdminBusinessListView,
    AdminBusinessDetailView,
    AdminUserListView,
    AdminUserDetailView,
    AdminAdminListView,
    AdminAdminDetailView,
)

app_name = "koperaadmin"

urlpatterns = [
    path("accounts/", AdminAccountListView.as_view(), name="account-list"),
    path(
        "accounts/<uuid:owner_user_id>/",
        AdminAccountDetailView.as_view(),
        name="account-detail",
    ),
    path("owners/", AdminOwnerListView.as_view(), name="owner-list"),
    path(
        "owners/<uuid:owner_id>/",
        AdminOwnerDetailView.as_view(),
        name="owner-detail",
    ),
    path("businesses/", AdminBusinessListView.as_view(), name="business-list"),
    path(
        "businesses/<uuid:business_id>/",
        AdminBusinessDetailView.as_view(),
        name="business-detail",
    ),
    path("users/", AdminUserListView.as_view(), name="user-list"),
    path(
        "users/<uuid:user_id>/",
        AdminUserDetailView.as_view(),
        name="user-detail",
    ),
    path("admins/", AdminAdminListView.as_view(), name="admin-list"),
    path(
        "admins/<uuid:admin_id>/",
        AdminAdminDetailView.as_view(),
        name="admin-detail",
    ),
]
