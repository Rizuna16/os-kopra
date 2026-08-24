from django.urls import path

from apps.inventory.views import BatchCreateView, BatchDetailView

urlpatterns = [
    path("", BatchCreateView.as_view(), name="batch-list-create"),
    path("<uuid:id>/", BatchDetailView.as_view(), name="batch-detail"),
]
