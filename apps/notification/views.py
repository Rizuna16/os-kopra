from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.business.models import Business
from apps.notification.models import Notification
from apps.authentication.permissions import BusinessAccessMixin


def serialize_notification(notification):
    return {
        "id": str(notification.id),
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "is_read": notification.is_read,
        "created_at": notification.created_at,
    }


class NotificationListView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.require_business_permission("notification", "view")
        notifications = Notification.objects.filter(
            business=business, recipient=request.user
        ).order_by("-created_at")
        return Response(
            [serialize_notification(n) for n in notifications], status=200
        )


class NotificationDetailView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, notification_id):
        business = self.require_business_permission("notification", "view")
        notification = get_object_or_404(
            Notification,
            business=business,
            recipient=request.user,
            pk=notification_id,
        )
        return Response(serialize_notification(notification), status=200)


class NotificationReadView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, business_id, notification_id):
        business = self.require_business_permission("notification", "view")
        notification = get_object_or_404(
            Notification,
            business=business,
            recipient=request.user,
            pk=notification_id,
        )
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(serialize_notification(notification), status=200)
