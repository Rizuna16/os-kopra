from django.urls import path

from apps.ai.views import AIQuestionView

app_name = "ai"
urlpatterns = [
    path("question/", AIQuestionView.as_view(), name="question"),
]
