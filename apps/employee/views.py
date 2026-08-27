from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.business.models import Business
from apps.employee.models import Employee
from apps.employee.serializers import EmployeeSerializer
from apps.authentication.permissions import BusinessAccessMixin


class BusinessOwnedMixin(BusinessAccessMixin):
    permission_classes = [IsAuthenticated]


class EmployeeListView(BusinessOwnedMixin, APIView):
    def get(self, request, business_id):
        self.require_business_permission("employee", "view")
        qs = Employee.objects.filter(business_id=business_id)
        return Response(EmployeeSerializer(qs, many=True).data)

    def post(self, request, business_id):
        business = self.require_business_permission("employee", "create")
        serializer = EmployeeSerializer(data=request.data, context={"business": business})
        serializer.is_valid(raise_exception=True)
        serializer.save(business=business)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class EmployeeDetailView(BusinessOwnedMixin, APIView):
    def get_object(self, business_id, pk):
        self.require_business_permission("employee", "view")
        return get_object_or_404(Employee, business_id=business_id, pk=pk)

    def get(self, request, business_id, id):
        obj = self.get_object(business_id, id)
        return Response(EmployeeSerializer(obj).data)

    def patch(self, request, business_id, id):
        self.require_business_permission("employee", "update")
        obj = get_object_or_404(Employee, business_id=business_id, pk=id)
        serializer = EmployeeSerializer(
            obj, data=request.data, partial=True, context={"business": obj.business}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, business_id, id):
        self.require_business_permission("employee", "delete")
        obj = get_object_or_404(Employee, business_id=business_id, pk=id)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
