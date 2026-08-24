from django.urls import path

from apps.finance.views import ExpenseListView

urlpatterns = [
    path("", ExpenseListView.as_view(), name="expense-list"),
]
