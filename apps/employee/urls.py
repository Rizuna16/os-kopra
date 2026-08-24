from django.urls import path

from apps.employee.views import EmployeeDetailView, EmployeeListView

urlpatterns = [
    path("", EmployeeListView.as_view(), name="employee-list"),
    path("<uuid:id>/", EmployeeDetailView.as_view(), name="employee-detail"),
]
