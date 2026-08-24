from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai import services


class AIQuestionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question = request.data.get("question")
        if not isinstance(question, str) or not question.strip():
            return Response({"detail": "question is required."}, status=400)
        try:
            answer = services.answer_question(request.user, question.strip())
        except services.ProviderError:
            return Response({"detail": "AI provider unavailable."}, status=502)
        return Response({"answer": answer, "advisory": True}, status=200)
