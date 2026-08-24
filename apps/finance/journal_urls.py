from django.urls import path

from apps.finance.views import (
    JournalDetailView,
    JournalEntryListView,
    JournalListView,
    JournalPostView,
    JournalReverseView,
)

urlpatterns = [
    path("", JournalListView.as_view(), name="journal-list"),
    path("<uuid:id>/", JournalDetailView.as_view(), name="journal-detail"),
    path("<uuid:id>/post/", JournalPostView.as_view(), name="journal-post"),
    path(
        "<uuid:id>/reverse/",
        JournalReverseView.as_view(),
        name="journal-reverse",
    ),
    path(
        "<uuid:journal_id>/entries/",
        JournalEntryListView.as_view(),
        name="journalentry-list",
    ),
]
