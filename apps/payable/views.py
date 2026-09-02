from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Q, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied

from apps.business.models import Location
from apps.payable.models import Payable, SupplierPaymentAllocation
from apps.payable.serializers import (
    PayableSerializer,
    PayableUpdateSerializer,
    PayableCreateSerializer,
    SupplierPaymentCreateSerializer,
    SupplierPaymentReverseSerializer,
    PayableCloseSerializer,
)
from apps.authentication.permissions import BusinessAccessMixin, resolve_business_role
from apps.audit.services import record_audit_event


class PayableListView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.require_business_permission("payables", "view")

        payables = Payable.objects.filter(business=business)

        location_id = request.query_params.get("location")
        status_filter = request.query_params.get("status")
        supplier_filter = request.query_params.get("supplier")
        overdue_filter = request.query_params.get("overdue", "").lower()
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        if location_id:
            location = get_object_or_404(Location, pk=location_id, business=business)
            payables = payables.filter(location=location)

        if status_filter:
            payables = payables.filter(status=status_filter.upper())

        if supplier_filter:
            payables = payables.filter(supplier_id=supplier_filter)

        if date_from:
            payables = payables.filter(due_date__gte=date_from)
        if date_to:
            payables = payables.filter(due_date__lte=date_to)

        if overdue_filter == "true":
            business_today = timezone.localdate()
            payables = payables.filter(
                due_date__lt=business_today,
                outstanding_amount__gt=0,
                status__in=[Payable.Status.UNPAID, Payable.Status.PARTIAL],
            )

        serializer = PayableSerializer(payables, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, business_id):
        business = self.require_business_permission("payables", "create")
        serializer = PayableCreateSerializer(
            data=request.data, context={"business": business, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        payable = serializer.save()
        return Response(
            PayableSerializer(payable).data, status=status.HTTP_201_CREATED
        )


class PayableDetailView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, id):
        business = self.require_business_permission("payables", "view")
        payable = get_object_or_404(
            Payable.objects.filter(business=business), pk=id
        )
        return Response(PayableSerializer(payable).data, status=status.HTTP_200_OK)

    def patch(self, request, business_id, id):
        business = self.require_business_permission("payables", "update")
        payable = get_object_or_404(
            Payable.objects.filter(business=business), pk=id
        )

        serializer = PayableUpdateSerializer(
            payable,
            data=request.data,
            partial=True,
            context={"business": business, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(PayableSerializer(payable).data, status=status.HTTP_200_OK)


class PayablePayView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, business_id, id):
        business = self.require_business_permission("payables", "create")

        with transaction.atomic():
            payable = Payable.objects.select_for_update().get(
                pk=id, business=business
            )

            # Terminal status guard
            if payable.status in [
                Payable.Status.PAID,
                Payable.Status.CLOSED,
                Payable.Status.VOIDED,
            ]:
                return Response(
                    {
                        "detail": f"Cannot record payment on a payable that is {payable.status}."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = SupplierPaymentCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            amount = serializer.validated_data["amount"]
            payment_method = serializer.validated_data["payment_method"]
            reference = serializer.validated_data.get("reference", "")
            notes = serializer.validated_data.get("notes", "")

            # Atomic balance validation
            if amount > payable.outstanding_amount:
                return Response(
                    {
                        "detail": f"Payment amount ({amount}) exceeds current outstanding balance ({payable.outstanding_amount})."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            allocation = SupplierPaymentAllocation.objects.create(
                business=business,
                payable=payable,
                amount=amount,
                payment_method=payment_method,
                reference=reference,
                notes=notes,
                created_by=request.user,
            )

            # Recompute balances from valid (non-reversed) allocations
            valid_total = (
                payable.allocations.filter(is_reversed=False)
                .aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )
            payable.paid_amount = valid_total
            payable.outstanding_amount = payable.original_amount - valid_total

            if payable.outstanding_amount == 0:
                payable.status = Payable.Status.PAID
            else:
                payable.status = Payable.Status.PARTIAL

            payable.save()

            record_audit_event(
                actor=request.user,
                action="SUPPLIER_PAYMENT_ALLOCATED",
                business=business,
                location=payable.location,
                target=str(allocation.id),
                resource="SupplierPaymentAllocation",
                event_type="SUPPLIER_PAYMENT_ALLOCATED",
                outcome="SUCCESS",
            )

        return Response(
            {
                "payment": {
                    "id": str(allocation.id),
                    "amount": str(allocation.amount),
                    "payment_method": allocation.payment_method,
                    "payment_date": allocation.payment_date,
                },
                "payable": {
                    "id": str(payable.id),
                    "paid_amount": str(payable.paid_amount),
                    "outstanding_amount": str(payable.outstanding_amount),
                    "status": payable.status,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class PayablePaymentReverseView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, business_id, id, payment_id):
        business = self.require_business_permission("payables", "create")

        # Owner-only
        role = resolve_business_role(request.user, business)
        if role != "OWNER":
            raise PermissionDenied("Only the business Owner can reverse payments.")

        with transaction.atomic():
            payable = Payable.objects.select_for_update().get(
                pk=id, business=business
            )

            if payable.status == Payable.Status.CLOSED:
                return Response(
                    {"detail": "Cannot reverse payments on a CLOSED payable."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            allocation = get_object_or_404(
                SupplierPaymentAllocation.objects.filter(business=business, payable=payable),
                pk=payment_id,
            )

            # Double reversal block
            if allocation.is_reversed:
                return Response(
                    {"detail": "Payment has already been reversed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = SupplierPaymentReverseSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            reversal_reason = serializer.validated_data["reversal_reason"]

            allocation.is_reversed = True
            allocation.reversed_at = timezone.now()
            allocation.reversed_by = request.user
            allocation.reversal_reason = reversal_reason
            allocation.save()

            # Recompute balances
            valid_total = (
                payable.allocations.filter(is_reversed=False)
                .aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )
            payable.paid_amount = valid_total
            payable.outstanding_amount = payable.original_amount - valid_total

            if valid_total == 0:
                payable.status = Payable.Status.UNPAID
            elif valid_total < payable.original_amount:
                payable.status = Payable.Status.PARTIAL
            else:
                payable.status = Payable.Status.PAID

            payable.save()

            record_audit_event(
                actor=request.user,
                action="SUPPLIER_PAYMENT_REVERSED",
                business=business,
                location=payable.location,
                target=str(allocation.id),
                resource="SupplierPaymentAllocation",
                event_type="SUPPLIER_PAYMENT_REVERSED",
                outcome="SUCCESS",
            )

        return Response(
            {
                "payment": {
                    "id": str(allocation.id),
                    "is_reversed": allocation.is_reversed,
                    "reversed_at": allocation.reversed_at,
                    "reversal_reason": allocation.reversal_reason,
                },
                "payable": {
                    "id": str(payable.id),
                    "paid_amount": str(payable.paid_amount),
                    "outstanding_amount": str(payable.outstanding_amount),
                    "status": payable.status,
                },
            },
            status=status.HTTP_200_OK,
        )


class PayableCloseView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, business_id, id):
        business = self.require_business_permission("payables", "update")

        # Owner-only
        role = resolve_business_role(request.user, business)
        if role != "OWNER":
            raise PermissionDenied("Only the business Owner can close payables.")

        with transaction.atomic():
            payable = Payable.objects.select_for_update().get(
                pk=id, business=business
            )

            if payable.status in [
                Payable.Status.PAID,
                Payable.Status.VOIDED,
                Payable.Status.CLOSED,
            ]:
                return Response(
                    {
                        "detail": f"Cannot close a payable that is {payable.status}."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = PayableCloseSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            notes = serializer.validated_data.get("notes", "")

            payable.status = Payable.Status.CLOSED
            payable.outstanding_amount = Decimal("0.00")
            payable.notes = notes
            payable.save()

            record_audit_event(
                actor=request.user,
                action="PAYABLE_CLOSED",
                business=business,
                location=payable.location,
                target=str(payable.id),
                resource="Payable",
                event_type="PAYABLE_CLOSED",
                outcome="SUCCESS",
            )

        return Response(PayableSerializer(payable).data, status=status.HTTP_200_OK)


class UtangReportView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.require_business_permission("payables", "view")

        payables = Payable.objects.filter(business=business)

        active_payables = payables.exclude(status__in=[Payable.Status.PAID, Payable.Status.VOIDED])

        # For CLOSED payables, outstanding is 0 but we must exclude from active totals
        active_not_closed = active_payables.exclude(status=Payable.Status.CLOSED)

        business_today = timezone.localdate()

        total_outstanding = active_not_closed.aggregate(
            total=Sum("outstanding_amount")
        )["total"] or Decimal("0.00")

        overdue_payables = payables.filter(
            due_date__lt=business_today,
            outstanding_amount__gt=0,
            status__in=[Payable.Status.UNPAID, Payable.Status.PARTIAL],
        )
        total_overdue = overdue_payables.aggregate(
            total=Sum("outstanding_amount")
        )["total"] or Decimal("0.00")

        suppliers_with_debt = payables.filter(
            supplier__isnull=False,
            outstanding_amount__gt=0,
            status__in=[Payable.Status.UNPAID, Payable.Status.PARTIAL],
        ).values("supplier").distinct().count()

        # Aging buckets
        aging_summary = {
            "not_due": Decimal("0.00"),
            "days_1_15": Decimal("0.00"),
            "days_16_30": Decimal("0.00"),
            "days_31_60": Decimal("0.00"),
            "over_60_days": Decimal("0.00"),
        }

        for pay in active_not_closed:
            outstanding = pay.outstanding_amount
            due = pay.due_date
            if due is None or due >= business_today:
                aging_summary["not_due"] += outstanding
            else:
                days_overdue = (business_today - due).days
                if 0 < days_overdue <= 15:
                    aging_summary["days_1_15"] += outstanding
                elif 16 <= days_overdue <= 30:
                    aging_summary["days_16_30"] += outstanding
                elif 31 <= days_overdue <= 60:
                    aging_summary["days_31_60"] += outstanding
                else:
                    aging_summary["over_60_days"] += outstanding

        # Payables by supplier
        payables_by_supplier = []
        supplier_totals = active_not_closed.values("supplier").annotate(
            outstanding=Sum("outstanding_amount"),
            count=Count("id"),
        )
        for entry in supplier_totals:
            supplier_id = entry["supplier"]
            from apps.supplier.models import Supplier
            try:
                sup = Supplier.objects.get(pk=supplier_id)
                supplier_name = sup.name
            except Supplier.DoesNotExist:
                supplier_name = "Unknown"

            payables_by_supplier.append({
                "supplier_id": str(supplier_id),
                "supplier_name": supplier_name,
                "outstanding": str(entry["outstanding"] or Decimal("0.00")),
                "open_payables_count": entry["count"],
            })

        return Response({
            "total_outstanding": str(total_outstanding),
            "total_overdue": str(total_overdue),
            "count_suppliers_with_debt": suppliers_with_debt,
            "aging_summary": {
                "not_due": str(aging_summary["not_due"]),
                "days_1_15": str(aging_summary["days_1_15"]),
                "days_16_30": str(aging_summary["days_16_30"]),
                "days_31_60": str(aging_summary["days_31_60"]),
                "over_60_days": str(aging_summary["over_60_days"]),
            },
            "payables_by_supplier": payables_by_supplier,
        }, status=status.HTTP_200_OK)
