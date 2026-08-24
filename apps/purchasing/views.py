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


class PurchaseOrderListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        purchase_orders = PurchaseOrder.objects.filter(business=business)
        serializer = PurchaseOrderSerializer(purchase_orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, business_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        serializer = PurchaseOrderCreateSerializer(
            data=request.data, context={"business": business, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        purchase_order = serializer.save()
        return Response(
            PurchaseOrderSerializer(purchase_order).data,
            status=status.HTTP_201_CREATED,
        )


class PurchaseOrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, id):
        purchase_order = get_object_or_404(
            PurchaseOrder.objects.filter(business__owner=request.user), pk=id
        )
        return Response(
            PurchaseOrderSerializer(purchase_order).data, status=status.HTTP_200_OK
        )

    def patch(self, request, business_id, id):
        purchase_order = get_object_or_404(
            PurchaseOrder.objects.filter(business__owner=request.user), pk=id
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
        purchase_order = get_object_or_404(
            PurchaseOrder.objects.filter(business__owner=request.user), pk=id
        )
        purchase_order.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
