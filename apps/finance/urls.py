from django.urls import path

from apps.finance.views import AccountDetailView, AccountListView

urlpatterns = [
    path("", AccountListView.as_view(), name="account-list"),
    path("<uuid:id>/", AccountDetailView.as_view(), name="account-detail"),
]
