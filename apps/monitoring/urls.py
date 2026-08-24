from django.urls import path

from apps.monitoring.views import HealthView, MonitoringView

app_name = "monitoring"

urlpatterns = [
    path("", MonitoringView.as_view(), name="monitoring"),
    path("health/", HealthView.as_view(), name="monitoring-health"),
]
