import logging
from datetime import timedelta

from django.db import transaction as db_transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.clients import create_snap_transaction, verify_midtrans_signature
from apps.billing.models import Payment, PaymentWebhookEvent, Plan
from apps.billing.serializers import PaymentCreateSerializer, PaymentSerializer, PlanSerializer
from apps.business.models import Subscription

logger = logging.getLogger("apps.billing")


def _compute_period(plan):
    now = timezone.now()
    if plan.billing_interval == Plan.BillingInterval.YEARLY:
        period_end = now + timedelta(days=365)
    else:
        period_end = now + timedelta(days=30)
    return now, period_end


def _apply_payment_lifecycle(payment):
    subscription = payment.subscription
    purpose = payment.purpose
    now = timezone.now()

    if subscription.status == Subscription.Status.CANCELED:
        return

    if purpose == Payment.Purpose.RENEWAL:
        period_start = subscription.period_end or now
        if plan_billing_interval := getattr(subscription.plan, "billing_interval", None):
            if plan_billing_interval == Plan.BillingInterval.YEARLY:
                period_end = period_start + timedelta(days=365)
            else:
                period_end = period_start + timedelta(days=30)
        else:
            period_end = period_start + timedelta(days=30)
        subscription.period_start = subscription.period_start or now
        subscription.period_end = period_end
        subscription.status = Subscription.Status.ACTIVE
        subscription.save(update_fields=["status", "period_start", "period_end", "updated_at"])

    elif purpose == Payment.Purpose.UPGRADE:
        new_period_start, new_period_end = _compute_period(payment.plan)
        subscription.plan = payment.plan
        subscription.period_start = new_period_start
        subscription.period_end = new_period_end
        subscription.status = Subscription.Status.ACTIVE
        subscription.save(update_fields=["status", "plan", "period_start", "period_end", "updated_at"])

    else:
        new_period_start, new_period_end = _compute_period(payment.plan)
        subscription.plan = payment.plan
        subscription.period_start = new_period_start
        subscription.period_end = new_period_end
        subscription.status = Subscription.Status.ACTIVE
        subscription.save(update_fields=["status", "plan", "period_start", "period_end", "updated_at"])

logger = logging.getLogger("apps.billing")


class PlanListView(APIView):
    permission_classes = [IsAuthenticated]  # Updated per instruction

    def get(self, request):
        plans = Plan.objects.filter(is_active=True)
        return Response(PlanSerializer(plans, many=True).data)


class PaymentCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sub_id = serializer.validated_data["subscription_id"]
        plan_id = serializer.validated_data["plan_id"]
        purpose = serializer.validated_data.get("purpose", Payment.Purpose.INITIAL)

        with db_transaction.atomic():
            subscription = (
                Subscription.objects.select_for_update()
                .filter(pk=sub_id, business__owner=request.user)
                .select_related("business")
                .first()
            )
            if subscription is None:
                return Response({"error": "Subscription not found."}, status=status.HTTP_404_NOT_FOUND)

            plan = Plan.objects.filter(pk=plan_id, is_active=True).first()
            if plan is None:
                return Response({"error": "Plan not found or inactive."}, status=status.HTTP_400_BAD_REQUEST)

            if subscription.status == Subscription.Status.ACTIVE and subscription.period_end and subscription.period_end <= timezone.now():
                subscription.status = Subscription.Status.EXPIRED
                subscription.save(update_fields=["status", "updated_at"])

            if purpose == Payment.Purpose.INITIAL:
                if Payment.objects.filter(
                    subscription=subscription,
                    status__in=[Payment.Status.PENDING, Payment.Status.PAID],
                ).exists():
                    return Response(
                        {"error": "An active or paid payment already exists for this subscription."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            if subscription.status == Subscription.Status.CANCELED:
                return Response(
                    {"error": "Subscription is canceled."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if purpose == Payment.Purpose.UPGRADE and subscription.status == Subscription.Status.EXPIRED:
                return Response(
                    {"error": "Cannot upgrade an expired subscription. Renew first."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if purpose == Payment.Purpose.UPGRADE:
                if not subscription.plan:
                    return Response({"error": "Subscription has no current effective plan."}, status=status.HTTP_400_BAD_REQUEST)
                if subscription.plan_id == plan_id:
                    return Response({"error": "Target plan must differ from current plan."}, status=status.HTTP_400_BAD_REQUEST)

            payment = Payment.objects.create(
                subscription=subscription,
                plan=plan,
                amount=plan.amount,
                currency=plan.currency,
                status=Payment.Status.PENDING,
                provider="MIDTRANS",
                purpose=purpose,
            )

        try:
            snap_response = create_snap_transaction(
                order_id=str(payment.id),
                gross_amount=plan.amount,
                item_details=[
                    {
                        "id": str(plan.id),
                        "price": float(plan.amount),
                        "quantity": 1,
                        "name": f"{plan.name} Plan",
                    },
                ],
            )
        except RuntimeError as e:
            payment.status = Payment.Status.FAILED
            payment.save(update_fields=["status"])
            return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        payment.provider_reference = snap_response.get("token", "")
        payment.save(update_fields=["provider_reference"])

        return Response(
            {
                "id": str(payment.id),
                "status": payment.status,
                "purpose": payment.purpose,
                "provider_reference": payment.provider_reference,
                "redirect_url": snap_response.get("redirect_url", ""),
                "token": snap_response.get("token", ""),
            },
            status=status.HTTP_201_CREATED,
        )


MIDTRANS_STATUS_MAP = {
    "settlement": Payment.Status.PAID,
    "capture": Payment.Status.PAID,
    "expire": Payment.Status.EXPIRED,
    "cancel": Payment.Status.CANCELED,
    "deny": Payment.Status.FAILED,
    "failure": Payment.Status.FAILED,
}


class MidtransWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.data
        event_id = payload.get("transaction_id") or payload.get("order_id")
        if not event_id:
            return Response({"error": "Missing identifier."}, status=status.HTTP_400_BAD_REQUEST)

        event, created = PaymentWebhookEvent.objects.get_or_create(
            provider="MIDTRANS",
            event_id=str(event_id),
            defaults={"payload": payload, "processed": False},
        )
        if not created and event.processed:
            return Response({"detail": "Already processed."}, status=status.HTTP_200_OK)

        if not verify_midtrans_signature(payload):
            logger.warning("Invalid Midtrans signature for event %s", event_id)
            return Response({"detail": "Invalid signature."}, status=status.HTTP_200_OK)

        order_id = payload.get("order_id")
        try:
            payment = Payment.objects.select_related("subscription").get(pk=order_id)
        except (Payment.DoesNotExist, ValueError):
            event.processed = True
            event.save(update_fields=["processed"])
            return Response({"detail": "Payment not found."}, status=status.HTTP_200_OK)

        event.payment = payment

        transaction_status = str(payload.get("transaction_status", "")).lower()
        new_status = MIDTRANS_STATUS_MAP.get(transaction_status)

        with db_transaction.atomic():
            event.processed = True
            event.save(update_fields=["payment", "processed"])

            if new_status is None:
                logger.info("Unhandled Midtrans status: %s for payment %s", transaction_status, order_id)
                return Response({"detail": "OK"}, status=status.HTTP_200_OK)

            if payment.status == Payment.Status.PAID and new_status != Payment.Status.PAID:
                return Response({"detail": "OK"}, status=status.HTTP_200_OK)

            payment.status = new_status
            if new_status == Payment.Status.PAID:
                payment.paid_at = timezone.now()
                payment.provider_reference = str(payload.get("transaction_id", ""))
                payment.save(update_fields=["status", "paid_at", "provider_reference", "updated_at"])

                _apply_payment_lifecycle(payment)
            else:
                payment.save(update_fields=["status", "updated_at"])

        return Response({"detail": "OK"}, status=status.HTTP_200_OK)
