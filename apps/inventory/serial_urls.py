from django.urls import path

from apps.inventory.views import SerialNumberCreateView, SerialNumberDetailView

urlpatterns = [
    path("", SerialNumberCreateView.as_view(), name="serial-number-list-create"),
    path("<uuid:id>/", SerialNumberDetailView.as_view(), name="serial-number-detail"),
]
