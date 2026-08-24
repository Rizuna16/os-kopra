from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.business.models import Business
from apps.notification.models import Notification


def get_owned_business(request, business_id):
    return get_object_or_404(
        Business.objects.filter(owner=request.user), pk=business_id
    )


def serialize_notification(notification):
    return {
        "id": str(notification.id),
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "is_read": notification.is_read,
        "created_at": notification.created_at,
    }


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_owned_business(request, business_id)
        notifications = Notification.objects.filter(
            business=business, recipient=request.user
        ).order_by("-created_at")
        return Response(
            [serialize_notification(n) for n in notifications], status=200
        )


class NotificationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, notification_id):
        business = get_owned_business(request, business_id)
        notification = get_object_or_404(
            Notification,
            business=business,
            recipient=request.user,
            pk=notification_id,
        )
        return Response(serialize_notification(notification), status=200)


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, business_id, notification_id):
        business = get_owned_business(request, business_id)
        notification = get_object_or_404(
            Notification,
            business=business,
            recipient=request.user,
            pk=notification_id,
        )
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(serialize_notification(notification), status=200)
