from django.urls import path

from apps.finance.views import LedgerDetailView, LedgerListView

urlpatterns = [
    path("", LedgerListView.as_view(), name="ledger-list"),
    path("<uuid:id>/", LedgerDetailView.as_view(), name="ledger-detail"),
]
