from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.business.models import Business
from apps.employee.models import Employee
from apps.employee.serializers import EmployeeSerializer


class BusinessOwnedMixin:
    permission_classes = [IsAuthenticated]

    def get_business(self):
        return get_object_or_404(
            Business.objects.filter(owner=self.request.user),
            pk=self.kwargs["business_id"],
        )


class EmployeeListView(BusinessOwnedMixin, APIView):
    def get(self, request, business_id):
        self.get_business()
        qs = Employee.objects.filter(business_id=business_id)
        return Response(EmployeeSerializer(qs, many=True).data)

    def post(self, request, business_id):
        business = self.get_business()
        serializer = EmployeeSerializer(data=request.data, context={"business": business})
        serializer.is_valid(raise_exception=True)
        serializer.save(business=business)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class EmployeeDetailView(BusinessOwnedMixin, APIView):
    def get_object(self, business_id, pk):
        self.get_business()
        return get_object_or_404(Employee, business_id=business_id, pk=pk)

    def get(self, request, business_id, id):
        obj = self.get_object(business_id, id)
        return Response(EmployeeSerializer(obj).data)

    def patch(self, request, business_id, id):
        obj = self.get_object(business_id, id)
        serializer = EmployeeSerializer(
            obj, data=request.data, partial=True, context={"business": obj.business}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, business_id, id):
        obj = self.get_object(business_id, id)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
