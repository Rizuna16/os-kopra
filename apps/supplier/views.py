from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.business.models import Business
from apps.supplier.models import Supplier
from apps.supplier.serializers import SupplierSerializer
from apps.authentication.permissions import BusinessAccessMixin


class SupplierListView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.require_business_permission("supplier", "view")
        suppliers = Supplier.objects.filter(business=business)
        serializer = SupplierSerializer(suppliers, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, business_id):
        business = self.require_business_permission("supplier", "create")
        serializer = SupplierSerializer(
            data=request.data, context={"business": business, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        supplier = serializer.save(business=business)
        return Response(
            SupplierSerializer(supplier).data, status=status.HTTP_201_CREATED
        )


class SupplierDetailView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, id):
        business = self.require_business_permission("supplier", "view")
        supplier = get_object_or_404(
            Supplier.objects.filter(business=business), pk=id
        )
        return Response(
            SupplierSerializer(supplier).data, status=status.HTTP_200_OK
        )

    def patch(self, request, business_id, id):
        business = self.require_business_permission("supplier", "update")
        supplier = get_object_or_404(
            Supplier.objects.filter(business=business), pk=id
        )
        serializer = SupplierSerializer(
            supplier, data=request.data, partial=True,
            context={"business": supplier.business, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            SupplierSerializer(supplier).data, status=status.HTTP_200_OK
        )

    def delete(self, request, business_id, id):
        business = self.require_business_permission("supplier", "delete")
        supplier = get_object_or_404(
            Supplier.objects.filter(business=business), pk=id
        )
        supplier.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
