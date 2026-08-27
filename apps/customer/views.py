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
from apps.authentication.permissions import BusinessAccessMixin


class CustomerListView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.require_business_permission("customer", "view")
        customers = Customer.objects.filter(business=business)
        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, business_id):
        business = self.require_business_permission("customer", "create")
        serializer = CustomerCreateSerializer(
            data=request.data, context={"business": business, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        customer = serializer.save()
        return Response(
            CustomerSerializer(customer).data, status=status.HTTP_201_CREATED
        )


class CustomerDetailView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, id):
        business = self.require_business_permission("customer", "view")
        customer = get_object_or_404(
            Customer.objects.filter(business=business), pk=id
        )
        return Response(
            CustomerSerializer(customer).data, status=status.HTTP_200_OK
        )

    def patch(self, request, business_id, id):
        business = self.require_business_permission("customer", "update")
        customer = get_object_or_404(
            Customer.objects.filter(business=business), pk=id
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
        business = self.require_business_permission("customer", "delete")
        customer = get_object_or_404(
            Customer.objects.filter(business=business), pk=id
        )
        customer.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
