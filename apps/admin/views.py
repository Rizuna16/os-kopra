from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admin.permissions import IsSuperAdmin
from apps.business.models import Business, Subscription


def _serialize_business(business):
    subscription = Subscription.objects.filter(business=business).first()
    return {
        "id": str(business.id),
        "name": business.name,
        "status": business.status,
        "owner_id": str(business.owner_id),
        "subscription_status": subscription.status if subscription else None,
    }


class AdminBusinessListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        # Platform-wide scope: admin reads across ALL Businesses.
        # Intentionally NOT filtered by business__owner=request.user.
        businesses = Business.objects.all().order_by("-created_at")
        return Response([_serialize_business(b) for b in businesses])


class AdminBusinessDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, business_id):
        business = Business.objects.filter(id=business_id).first()
        if business is None:
            return Response({"detail": "Not found."}, status=404)
        return Response(_serialize_business(business))
