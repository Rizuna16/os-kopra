from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.business.models import Business
from apps.purchasing.models import PurchaseOrder
from apps.purchasing.serializers import (
    PurchaseOrderCreateSerializer,
    PurchaseOrderSerializer,
    PurchaseOrderUpdateSerializer,
)
from apps.authentication.permissions import BusinessAccessMixin


class PurchaseOrderListView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.require_business_permission("purchasing", "view")
        purchase_orders = PurchaseOrder.objects.filter(business=business)
        serializer = PurchaseOrderSerializer(purchase_orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, business_id):
        business = self.require_business_permission("purchasing", "create")
        serializer = PurchaseOrderCreateSerializer(
            data=request.data, context={"business": business, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        purchase_order = serializer.save()
        return Response(
            PurchaseOrderSerializer(purchase_order).data,
            status=status.HTTP_201_CREATED,
        )


class PurchaseOrderDetailView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, id):
        business = self.require_business_permission("purchasing", "view")
        purchase_order = get_object_or_404(
            PurchaseOrder.objects.filter(business=business), pk=id
        )
        return Response(
            PurchaseOrderSerializer(purchase_order).data, status=status.HTTP_200_OK
        )

    def patch(self, request, business_id, id):
        business = self.require_business_permission("purchasing", "update")
        purchase_order = get_object_or_404(
            PurchaseOrder.objects.filter(business=business), pk=id
        )
        serializer = PurchaseOrderUpdateSerializer(
            purchase_order,
            data=request.data,
            partial=True,
            context={"business": purchase_order.business, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        purchase_order = serializer.save()
        return Response(
            PurchaseOrderSerializer(purchase_order).data, status=status.HTTP_200_OK
        )

    def delete(self, request, business_id, id):
        business = self.require_business_permission("purchasing", "delete")
        purchase_order = get_object_or_404(
            PurchaseOrder.objects.filter(business=business), pk=id
        )
        purchase_order.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
