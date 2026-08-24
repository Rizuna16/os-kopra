from django.urls import path

from apps.admin.views import AdminBusinessDetailView, AdminBusinessListView

app_name = "koperaadmin"

urlpatterns = [
    path("businesses/", AdminBusinessListView.as_view(), name="business-list"),
    path(
        "businesses/<uuid:business_id>/",
        AdminBusinessDetailView.as_view(),
        name="business-detail",
    ),
]
