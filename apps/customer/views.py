from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.business.models import Business
from apps.customer.models import Customer
from apps.customer.serializers import (
    CustomerCreateSerializer,
    CustomerSerializer,
    CustomerUpdateSerializer,
)


class CustomerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        customers = Customer.objects.filter(business=business)
        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, business_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        serializer = CustomerCreateSerializer(
            data=request.data, context={"business": business, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        customer = serializer.save()
        return Response(
            CustomerSerializer(customer).data, status=status.HTTP_201_CREATED
        )


class CustomerDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, id):
        customer = get_object_or_404(
            Customer.objects.filter(business__owner=request.user), pk=id
        )
        return Response(
            CustomerSerializer(customer).data, status=status.HTTP_200_OK
        )

    def patch(self, request, business_id, id):
        customer = get_object_or_404(
            Customer.objects.filter(business__owner=request.user), pk=id
        )
        serializer = CustomerUpdateSerializer(
            customer, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            CustomerSerializer(customer).data, status=status.HTTP_200_OK
        )

    def delete(self, request, business_id, id):
        customer = get_object_or_404(
            Customer.objects.filter(business__owner=request.user), pk=id
        )
        customer.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
