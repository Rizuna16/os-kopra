from django.urls import path

from apps.customer.views import CustomerDetailView, CustomerListView

urlpatterns = [
    path("", CustomerListView.as_view(), name="customer-list"),
    path("<uuid:id>/", CustomerDetailView.as_view(), name="customer-detail"),
]
