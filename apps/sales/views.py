from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.business.models import Business
from apps.sales.models import Sale
from apps.sales.serializers import (
    SaleCreateSerializer,
    SaleSerializer,
    SaleUpdateSerializer,
)


class SaleListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        sales = Sale.objects.filter(business=business)
        serializer = SaleSerializer(sales, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, business_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        serializer = SaleCreateSerializer(
            data=request.data, context={"business": business, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        sale = serializer.save()
        return Response(
            SaleSerializer(sale).data, status=status.HTTP_201_CREATED
        )


class SaleDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, id):
        sale = get_object_or_404(
            Sale.objects.filter(business__owner=request.user), pk=id
        )
        return Response(SaleSerializer(sale).data, status=status.HTTP_200_OK)

    def patch(self, request, business_id, id):
        sale = get_object_or_404(
            Sale.objects.filter(business__owner=request.user), pk=id
        )
        serializer = SaleUpdateSerializer(
            sale,
            data=request.data,
            partial=True,
            context={"business": sale.business, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        sale = serializer.save()
        return Response(SaleSerializer(sale).data, status=status.HTTP_200_OK)

    def delete(self, request, business_id, id):
        sale = get_object_or_404(
            Sale.objects.filter(business__owner=request.user), pk=id
        )
        sale.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
