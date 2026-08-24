from django.urls import path

from apps.backup.views import (
    BackupDetailView,
    BackupListView,
    BackupRestoreView,
    BackupTriggerView,
)

app_name = "backup"

urlpatterns = [
    path("", BackupListView.as_view(), name="backup-list"),
    path("trigger/", BackupTriggerView.as_view(), name="backup-trigger"),
    path("<uuid:pk>/", BackupDetailView.as_view(), name="backup-detail"),
    path("<str:pk>/restore/", BackupRestoreView.as_view(), name="backup-restore"),
]
