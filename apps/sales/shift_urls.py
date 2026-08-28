from django.urls import path
from apps.sales.views import CashierShiftListView, CashierShiftCloseView

urlpatterns = [
    path("", CashierShiftListView.as_view(), name="shift-list"),
    path("<uuid:shift_id>/close/", CashierShiftCloseView.as_view(), name="shift-close"),
]
