from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Q, F, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied

from apps.business.models import Location
from apps.receivable.models import Receivable, PaymentAllocation
from apps.receivable.serializers import (
    ReceivableSerializer,
    ReceivableUpdateSerializer,
    CreditSaleCreateSerializer,
    PaymentCreateSerializer,
    PaymentReverseSerializer,
    ReceivableCloseSerializer,
)
from apps.authentication.permissions import BusinessAccessMixin, resolve_business_role
from apps.audit.services import record_audit_event


class ReceivableListView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.require_business_permission("receivables", "view")
        role = resolve_business_role(request.user, business)

        receivables = Receivable.objects.filter(business=business)

        # Kasir active-location restriction
        location_id = request.query_params.get("location")
        status_filter = request.query_params.get("status")
        customer_filter = request.query_params.get("customer")
        overdue_filter = request.query_params.get("overdue", "").lower()
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        if role == "KASIR":
            if not location_id:
                # Kasir must specify their active location
                location_id = request.query_params.get("location")
                if not location_id:
                    return Response(
                        {"detail": "Location is required for cashier access."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            # Ensure Kasir can only see receivables at permitted locations
            location = get_object_or_404(Location, pk=location_id, business=business)
            receivables = receivables.filter(location=location)
        elif location_id:
            location = get_object_or_404(Location, pk=location_id, business=business)
            receivables = receivables.filter(location=location)

        if status_filter:
            receivables = receivables.filter(status=status_filter.upper())

        if customer_filter:
            receivables = receivables.filter(customer_id=customer_filter)

        if date_from:
            receivables = receivables.filter(due_date__gte=date_from)
        if date_to:
            receivables = receivables.filter(due_date__lte=date_to)

        # Overdue filtering (derived flag)
        if overdue_filter == "true":
            business_today = timezone.localdate()
            receivables = receivables.filter(
                due_date__lt=business_today,
                outstanding_amount__gt=0,
                status__in=[Receivable.Status.UNPAID, Receivable.Status.PARTIAL],
            )

        serializer = ReceivableSerializer(receivables, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, business_id):
        business = self.require_business_permission("receivables", "create")
        serializer = CreditSaleCreateSerializer(
            data=request.data, context={"business": business, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        receivable = serializer.save()
        return Response(
            ReceivableSerializer(receivable).data, status=status.HTTP_201_CREATED
        )


class ReceivableDetailView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, id):
        business = self.require_business_permission("receivables", "view")
        receivable = get_object_or_404(
            Receivable.objects.filter(business=business), pk=id
        )

        # Kasir active-location restriction on detail access
        role = resolve_business_role(request.user, business)
        if role == "KASIR":
            location_id = request.query_params.get("location") or request.data.get("location")
            if not location_id or str(receivable.location_id) != str(location_id):
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(ReceivableSerializer(receivable).data, status=status.HTTP_200_OK)

    def patch(self, request, business_id, id):
        business = self.require_business_permission("receivables", "update")
        receivable = get_object_or_404(
            Receivable.objects.filter(business=business), pk=id
        )

        # Role gate: update only Owner/Admin; contract §13 explicitly blocks Kasir
        role = resolve_business_role(request.user, business)
        if role == "KASIR":
            raise PermissionDenied("Kasir cannot update receivable fields.")

        serializer = ReceivableUpdateSerializer(
            receivable,
            data=request.data,
            partial=True,
            context={"business": business, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ReceivableSerializer(receivable).data, status=status.HTTP_200_OK)


class ReceivablePayView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, business_id, id):
        business = self.require_business_permission("receivables", "create")

        with transaction.atomic():
            receivable = Receivable.objects.select_for_update().get(
                pk=id, business=business
            )

            # Terminal status guard (Contract §9)
            if receivable.status in [
                Receivable.Status.PAID,
                Receivable.Status.CLOSED,
                Receivable.Status.VOIDED,
            ]:
                return Response(
                    {
                        "detail": f"Cannot record payment on a receivable that is {receivable.status}."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = PaymentCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            amount = serializer.validated_data["amount"]
            payment_method = serializer.validated_data["payment_method"]
            reference = serializer.validated_data.get("reference", "")
            notes = serializer.validated_data.get("notes", "")

            # Atomic balance validation
            if amount > receivable.outstanding_amount:
                return Response(
                    {
                        "detail": f"Payment amount ({amount}) exceeds current outstanding balance ({receivable.outstanding_amount})."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            allocation = PaymentAllocation.objects.create(
                business=business,
                receivable=receivable,
                amount=amount,
                payment_method=payment_method,
                reference=reference,
                notes=notes,
                created_by=request.user,
            )

            # Recompute balances from valid (non-reversed) allocations
            valid_total = (
                receivable.allocations.filter(is_reversed=False)
                .aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )
            receivable.paid_amount = valid_total
            receivable.outstanding_amount = receivable.original_amount - valid_total

            if receivable.outstanding_amount == 0:
                receivable.status = Receivable.Status.PAID
            else:
                receivable.status = Receivable.Status.PARTIAL

            receivable.save()

            record_audit_event(
                actor=request.user,
                action="PAYMENT_ALLOCATED",
                business=business,
                location=receivable.location,
                target=str(allocation.id),
                resource="PaymentAllocation",
                event_type="PAYMENT_ALLOCATED",
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
                "receivable": {
                    "id": str(receivable.id),
                    "paid_amount": str(receivable.paid_amount),
                    "outstanding_amount": str(receivable.outstanding_amount),
                    "status": receivable.status,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class ReceivablePaymentReverseView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, business_id, id, payment_id):
        business = self.require_business_permission("receivables", "create")

        # Owner-only (Contract §10)
        role = resolve_business_role(request.user, business)
        if role != "OWNER":
            raise PermissionDenied("Only the business Owner can reverse payments.")

        with transaction.atomic():
            receivable = Receivable.objects.select_for_update().get(
                pk=id, business=business
            )

            # CLOSED receivable cannot be reversed (Contract §9 + §10)
            if receivable.status == Receivable.Status.CLOSED:
                return Response(
                    {"detail": "Cannot reverse payments on a CLOSED receivable."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            allocation = get_object_or_404(
                PaymentAllocation.objects.filter(business=business, receivable=receivable),
                pk=payment_id,
            )

            # Double reversal block
            if allocation.is_reversed:
                return Response(
                    {"detail": "Payment has already been reversed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = PaymentReverseSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            reversal_reason = serializer.validated_data["reversal_reason"]

            allocation.is_reversed = True
            allocation.reversed_at = timezone.now()
            allocation.reversed_by = request.user
            allocation.reversal_reason = reversal_reason
            allocation.save()

            # Recompute balances
            valid_total = (
                receivable.allocations.filter(is_reversed=False)
                .aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )
            receivable.paid_amount = valid_total
            receivable.outstanding_amount = receivable.original_amount - valid_total

            if valid_total == 0:
                receivable.status = Receivable.Status.UNPAID
            elif valid_total < receivable.original_amount:
                receivable.status = Receivable.Status.PARTIAL
            else:
                receivable.status = Receivable.Status.PAID

            receivable.save()

            record_audit_event(
                actor=request.user,
                action="PAYMENT_REVERSED",
                business=business,
                location=receivable.location,
                target=str(allocation.id),
                resource="PaymentAllocation",
                event_type="PAYMENT_REVERSED",
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
                "receivable": {
                    "id": str(receivable.id),
                    "paid_amount": str(receivable.paid_amount),
                    "outstanding_amount": str(receivable.outstanding_amount),
                    "status": receivable.status,
                },
            },
            status=status.HTTP_200_OK,
        )


class ReceivableCloseView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, business_id, id):
        business = self.require_business_permission("receivables", "update")

        # Owner-only (Contract §12)
        role = resolve_business_role(request.user, business)
        if role != "OWNER":
            raise PermissionDenied("Only the business Owner can close receivables.")

        with transaction.atomic():
            receivable = Receivable.objects.select_for_update().get(
                pk=id, business=business
            )

            if receivable.status in [
                Receivable.Status.PAID,
                Receivable.Status.VOIDED,
                Receivable.Status.CLOSED,
            ]:
                return Response(
                    {
                        "detail": f"Cannot close a receivable that is {receivable.status}."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = ReceivableCloseSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            notes = serializer.validated_data.get("notes", "")

            receivable.status = Receivable.Status.CLOSED
            receivable.outstanding_amount = Decimal("0.00")
            receivable.notes = notes
            receivable.save()

            record_audit_event(
                actor=request.user,
                action="RECEIVABLE_CLOSED",
                business=business,
                location=receivable.location,
                target=str(receivable.id),
                resource="Receivable",
                event_type="RECEIVABLE_CLOSED",
                outcome="SUCCESS",
            )

        return Response(ReceivableSerializer(receivable).data, status=status.HTTP_200_OK)


class PiutangReportView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.require_business_permission("reports", "view")

        receivables = Receivable.objects.filter(business=business)

        active_receivables = receivables.exclude(status__in=[Receivable.Status.PAID, Receivable.Status.VOIDED])
        
        # For CLOSED receivables, outstanding is 0 but we must exclude from active totals
        active_not_closed = active_receivables.exclude(status=Receivable.Status.CLOSED)

        business_today = timezone.localdate()

        total_outstanding = active_not_closed.aggregate(
            total=Sum("outstanding_amount")
        )["total"] or Decimal("0.00")

        overdue_receivables = receivables.filter(
            due_date__lt=business_today,
            outstanding_amount__gt=0,
            status__in=[Receivable.Status.UNPAID, Receivable.Status.PARTIAL],
        )
        total_overdue = overdue_receivables.aggregate(
            total=Sum("outstanding_amount")
        )["total"] or Decimal("0.00")

        customers_with_debt = receivables.filter(
            customer__isnull=False,
            outstanding_amount__gt=0,
            status__in=[Receivable.Status.UNPAID, Receivable.Status.PARTIAL],
        ).values("customer").distinct().count()

        # Aging buckets
        aging_summary = {
            "not_due": Decimal("0.00"),
            "days_1_15": Decimal("0.00"),
            "days_16_30": Decimal("0.00"),
            "days_31_60": Decimal("0.00"),
            "over_60_days": Decimal("0.00"),
        }

        for rec in active_not_closed:
            outstanding = rec.outstanding_amount
            due = rec.due_date
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

        # Receivables by customer
        receivables_by_customer = []
        customer_totals = active_not_closed.values("customer").annotate(
            outstanding=Sum("outstanding_amount"),
            count=Count("id"),
        )
        for entry in customer_totals:
            customer = entry["customer"]
            from apps.customer.models import Customer
            try:
                cust = Customer.objects.get(pk=customer)
                cust_name = cust.name
            except Customer.DoesNotExist:
                cust_name = "Unknown"

            receivables_by_customer.append({
                "customer_id": str(customer),
                "customer_name": cust_name,
                "outstanding": str(entry["outstanding"] or Decimal("0.00")),
                "open_receivables_count": entry["count"],
            })

        return Response({
            "total_outstanding": str(total_outstanding),
            "total_overdue": str(total_overdue),
            "count_customers_with_debt": customers_with_debt,
            "aging_summary": {
                "not_due": str(aging_summary["not_due"]),
                "days_1_15": str(aging_summary["days_1_15"]),
                "days_16_30": str(aging_summary["days_16_30"]),
                "days_31_60": str(aging_summary["days_31_60"]),
                "over_60_days": str(aging_summary["over_60_days"]),
            },
            "receivables_by_customer": receivables_by_customer,
        }, status=status.HTTP_200_OK)
