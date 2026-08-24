from django.urls import path

from apps.notification.views import (
    NotificationDetailView,
    NotificationListView,
    NotificationReadView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path(
        "<uuid:notification_id>/",
        NotificationDetailView.as_view(),
        name="notification-detail",
    ),
    path(
        "<uuid:notification_id>/read/",
        NotificationReadView.as_view(),
        name="notification-read",
    ),
]
