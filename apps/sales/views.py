from decimal import Decimal
from django.db.models import Sum, F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied

from apps.business.models import Business
from apps.sales.models import Sale, SaleLine, CashierShift
from apps.sales.serializers import (
    SaleCreateSerializer,
    SaleSerializer,
    SaleUpdateSerializer,
    CashierShiftSerializer,
    CashierShiftCreateSerializer,
    CashierShiftCloseSerializer,
)
from apps.authentication.permissions import BusinessAccessMixin


class SaleListView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.require_business_permission("sales", "view")
        sales = Sale.objects.filter(business=business)
        serializer = SaleSerializer(sales, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, business_id):
        business = self.require_business_permission("sales", "create")
        serializer = SaleCreateSerializer(
            data=request.data, context={"business": business, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        sale = serializer.save()
        return Response(
            SaleSerializer(sale).data, status=status.HTTP_201_CREATED
        )


class SaleDetailView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, id):
        business = self.require_business_permission("sales", "view")
        sale = get_object_or_404(
            Sale.objects.filter(business=business), pk=id
        )
        return Response(SaleSerializer(sale).data, status=status.HTTP_200_OK)

    def patch(self, request, business_id, id):
        business = self.require_business_permission("sales", "update")
        sale = get_object_or_404(
            Sale.objects.filter(business=business), pk=id
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
        business = self.require_business_permission("sales", "delete")
        sale = get_object_or_404(
            Sale.objects.filter(business=business), pk=id
        )
        sale.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CashierShiftListView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.require_business_permission("shifts", "view")
        shifts = CashierShift.objects.filter(business=business)
        location_id = request.query_params.get("location")
        if location_id:
            shifts = shifts.filter(location_id=location_id)
        status_val = request.query_params.get("status")
        if status_val:
            shifts = shifts.filter(status=status_val)
        serializer = CashierShiftSerializer(shifts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, business_id):
        business = self.require_business_permission("shifts", "create")
        serializer = CashierShiftCreateSerializer(
            data=request.data,
            context={"business": business, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        shift = serializer.save()
        return Response(
            CashierShiftSerializer(shift).data,
            status=status.HTTP_201_CREATED
        )


class CashierShiftCloseView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, business_id, shift_id):
        business = self.require_business_permission("shifts", "update")
        shift = get_object_or_404(
            CashierShift.objects.filter(business=business), pk=shift_id
        )

        if shift.status == CashierShift.Status.CLOSED:
            return Response(
                {"detail": "Shift is already closed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.authentication.permissions import resolve_business_role
        role = resolve_business_role(request.user, business)
        if request.user != shift.cashier and role not in ["OWNER", "ADMIN"]:
            raise PermissionDenied("You do not have permission to close this shift.")

        serializer = CashierShiftCloseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uang_tunai_aktual = serializer.validated_data["uang_tunai_aktual"]

        # Calculate total cash sales associated with this shift
        total_cash_sales = SaleLine.objects.filter(
            sale__shift=shift,
            sale__status=Sale.Status.COMPLETED,
            sale__payment_method=Sale.PaymentMethod.CASH
        ).aggregate(
            total=Sum(F("quantity") * F("unit_price"))
        )["total"] or Decimal("0.00")

        expected_cash = shift.modal_awal + total_cash_sales
        selisih_kas = uang_tunai_aktual - expected_cash

        shift.uang_tunai_aktual = uang_tunai_aktual
        shift.selisih_kas = selisih_kas
        shift.status = CashierShift.Status.CLOSED
        shift.closed_at = timezone.now()
        shift.save()

        # Build response with expected variables
        res_data = CashierShiftSerializer(shift).data
        res_data["total_penjualan_tunai"] = str(total_cash_sales)
        return Response(res_data, status=status.HTTP_200_OK)
