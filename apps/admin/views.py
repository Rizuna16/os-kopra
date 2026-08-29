from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admin.permissions import IsSuperAdmin
from apps.authentication.models import User
from apps.business.models import Business, Subscription, BusinessMembership
from apps.employee.models import Employee
from apps.audit.models import AuditLog
from apps.billing.models import Plan, Payment


def _audit(actor, action, **kwargs):
    AuditLog.objects.create(actor=actor, action=action, **kwargs)


def _serialize_business(business):
    subscription = Subscription.objects.filter(business=business).first()
    return {
        "id": str(business.id),
        "name": business.name,
        "status": business.status,
        "owner_id": str(business.owner_id),
        "subscription_status": subscription.status if subscription else None,
    }


def _serialize_user(user):
    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "is_email_verified": user.is_email_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


class AdminBusinessListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        # Platform-wide scope: admin reads across ALL Businesses.
        # Intentionally NOT filtered by business__owner=request.user.
        businesses = Business.objects.all().order_by("-created_at")
        _audit(request.user, "BUSINESS_LIST_VIEWED", event_type="business")
        return Response([_serialize_business(b) for b in businesses])


class AdminBusinessDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, business_id):
        business = Business.objects.filter(id=business_id).first()
        if business is None:
            return Response({"detail": "Not found."}, status=404)
        _audit(
            request.user,
            "BUSINESS_DETAIL_VIEWED",
            event_type="business",
            business=business,
        )
        return Response(_serialize_business(business))


class AdminAccountListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        owners = User.objects.filter(businesses__isnull=False).distinct()
        accounts = []
        for owner in owners:
            businesses = Business.objects.filter(owner=owner)
            subscriptions = Subscription.objects.filter(business__in=businesses)
            user_ids = BusinessMembership.objects.filter(
                business__in=businesses
            ).values_list("user", flat=True).distinct()
            accounts.append(
                {
                    "owner_id": str(owner.id),
                    "owner_email": owner.email,
                    "owner_name": f"{owner.first_name} {owner.last_name}".strip(),
                    "business_count": businesses.count(),
                    "businesses": [_serialize_business(b) for b in businesses],
                    "user_count": user_ids.count(),
                    "subscription_summary": {
                        "total": subscriptions.count(),
                        "active": subscriptions.filter(status="ACTIVE").count(),
                        "expired": subscriptions.exclude(status="ACTIVE").count(),
                    },
                }
            )
        _audit(request.user, "ACCOUNT_LIST_VIEWED", event_type="account")
        return Response(accounts)


class AdminAccountDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, owner_user_id):
        owner = User.objects.filter(id=owner_user_id).first()
        if owner is None:
            return Response({"detail": "Not found."}, status=404)
        businesses = Business.objects.filter(owner=owner)
        if not businesses.exists():
            return Response({"detail": "Not found."}, status=404)
        subscriptions = Subscription.objects.filter(business__in=businesses)
        user_ids = BusinessMembership.objects.filter(
            business__in=businesses
        ).values_list("user", flat=True).distinct()
        _audit(
            request.user,
            "ACCOUNT_DETAIL_VIEWED",
            event_type="account",
            target=str(owner.id),
        )
        return Response(
            {
                "owner_id": str(owner.id),
                "owner_email": owner.email,
                "owner_name": f"{owner.first_name} {owner.last_name}".strip(),
                "business_count": businesses.count(),
                "businesses": [_serialize_business(b) for b in businesses],
                "user_count": user_ids.count(),
                "subscription_summary": {
                    "total": subscriptions.count(),
                    "active": subscriptions.filter(status="ACTIVE").count(),
                    "expired": subscriptions.exclude(status="ACTIVE").count(),
                },
            }
        )


class AdminOwnerListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        owners = User.objects.filter(businesses__isnull=False).distinct()
        result = []
        for owner in owners:
            businesses = Business.objects.filter(owner=owner)
            subscriptions = Subscription.objects.filter(business__in=businesses)
            result.append(
                {
                    "id": str(owner.id),
                    "email": owner.email,
                    "first_name": owner.first_name,
                    "last_name": owner.last_name,
                    "is_active": owner.is_active,
                    "is_email_verified": owner.is_email_verified,
                    "business_count": businesses.count(),
                    "businesses": [_serialize_business(b) for b in businesses],
                    "subscription_summary": {
                        "total": subscriptions.count(),
                        "active": subscriptions.filter(status="ACTIVE").count(),
                    },
                }
            )
        _audit(request.user, "OWNER_LIST_VIEWED", event_type="owner")
        return Response(result)


class AdminOwnerDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, owner_id):
        owner = User.objects.filter(id=owner_id).first()
        if owner is None:
            return Response({"detail": "Not found."}, status=404)
        businesses = Business.objects.filter(owner=owner)
        if not businesses.exists():
            return Response({"detail": "Not found."}, status=404)
        subscriptions = Subscription.objects.filter(business__in=businesses)
        _audit(
            request.user,
            "OWNER_DETAIL_VIEWED",
            event_type="owner",
            target=str(owner.id),
        )
        return Response(
            {
                "id": str(owner.id),
                "email": owner.email,
                "first_name": owner.first_name,
                "last_name": owner.last_name,
                "is_active": owner.is_active,
                "is_email_verified": owner.is_email_verified,
                "business_count": businesses.count(),
                "businesses": [_serialize_business(b) for b in businesses],
                "subscription_summary": {
                    "total": subscriptions.count(),
                    "active": subscriptions.filter(status="ACTIVE").count(),
                    "expired": subscriptions.exclude(status="ACTIVE").count(),
                },
            }
        )


class AdminUserListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        users = User.objects.all().order_by("-created_at")
        result = [_serialize_user(u) for u in users]
        _audit(request.user, "USER_LIST_VIEWED", event_type="user")
        return Response(result)


class AdminUserDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, user_id):
        user = User.objects.filter(id=user_id).first()
        if user is None:
            return Response({"detail": "Not found."}, status=404)
        memberships = BusinessMembership.objects.filter(user=user)
        employees = Employee.objects.filter(user=user)
        accessible_businesses = Business.objects.filter(memberships__user=user).distinct()
        _audit(
            request.user,
            "USER_DETAIL_VIEWED",
            event_type="user",
            target=str(user.id),
        )
        return Response(
            {
                **_serialize_user(user),
                "accessible_businesses": [
                    _serialize_business(b) for b in accessible_businesses
                ],
                "memberships": [
                    {
                        "business_id": str(m.business_id),
                        "role": m.role,
                    }
                    for m in memberships
                ],
                "employee_info": [
                    {
                        "business_id": str(e.business_id),
                        "name": e.name,
                        "code": e.code,
                        "active": e.active,
                    }
                    for e in employees
                ],
            }
        )


class AdminAdminListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        # Internal KOPERA platform administrative users.
        admins = User.objects.filter(is_staff=True).order_by("-created_at")
        result = [
            {
                "id": str(a.id),
                "email": a.email,
                "first_name": a.first_name,
                "last_name": a.last_name,
                "is_staff": a.is_staff,
                "is_superuser": a.is_superuser,
                "is_active": a.is_active,
            }
            for a in admins
        ]
        _audit(request.user, "ADMIN_LIST_VIEWED", event_type="admin")
        return Response(result)


class AdminAdminDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, admin_id):
        admin = User.objects.filter(id=admin_id, is_staff=True).first()
        if admin is None:
            return Response({"detail": "Not found."}, status=404)
        _audit(
            request.user,
            "ADMIN_DETAIL_VIEWED",
            event_type="admin",
            target=str(admin.id),
        )
        return Response(
            {
                "id": str(admin.id),
                "email": admin.email,
                "first_name": admin.first_name,
                "last_name": admin.last_name,
                "is_staff": admin.is_staff,
                "is_superuser": admin.is_superuser,
                "is_active": admin.is_active,
            }
        )


def _serialize_subscription(sub):
    business = sub.business
    owner = business.owner if business else None
    return {
        "id": str(sub.id),
        "business_id": str(business.id) if business else None,
        "business_name": business.name if business else None,
        "owner_id": str(owner.id) if owner else None,
        "owner_email": owner.email if owner else None,
        "status": sub.status,
        "created_at": sub.created_at.isoformat() if sub.created_at else None,
        "updated_at": sub.updated_at.isoformat() if sub.updated_at else None,
    }


def _serialize_plan(plan):
    return {
        "id": str(plan.id),
        "name": plan.name,
        "code": plan.code,
        "amount": str(plan.amount),
        "currency": plan.currency,
        "billing_interval": plan.billing_interval,
        "is_active": plan.is_active,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
        "updated_at": plan.updated_at.isoformat() if plan.updated_at else None,
    }


class AdminSubscriptionListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        subscriptions = Subscription.objects.all().order_by("-created_at")
        _audit(request.user, "SUBSCRIPTION_LIST_VIEWED", event_type="subscription")
        return Response([_serialize_subscription(s) for s in subscriptions])


class AdminSubscriptionDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, subscription_id):
        sub = Subscription.objects.filter(id=subscription_id).first()
        if sub is None:
            return Response({"detail": "Not found."}, status=404)
        _audit(
            request.user,
            "SUBSCRIPTION_DETAIL_VIEWED",
            event_type="subscription",
            target=str(sub.id),
        )
        return Response(_serialize_subscription(sub))


class AdminPlanListCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        plans = Plan.objects.all().order_by("-created_at")
        _audit(request.user, "PLAN_LIST_VIEWED", event_type="plan")
        return Response([_serialize_plan(p) for p in plans])

    def post(self, request):
        data = request.data
        name = data.get("name")
        code = data.get("code")
        amount = data.get("amount")
        billing_interval = data.get("billing_interval", Plan.BillingInterval.MONTHLY)
        is_active = data.get("is_active", True)
        currency = data.get("currency", "IDR")

        if not name or not code or amount is None:
            return Response({"detail": "Missing required fields (name, code, amount)."}, status=400)

        if Plan.objects.filter(code=code).exists():
            return Response({"detail": "Plan with this code already exists."}, status=400)

        plan = Plan.objects.create(
            name=name,
            code=code,
            amount=amount,
            billing_interval=billing_interval,
            is_active=is_active,
            currency=currency,
        )
        _audit(request.user, "PLAN_CREATED", event_type="plan", target=str(plan.id))
        return Response(_serialize_plan(plan), status=201)


class AdminPlanDetailUpdateView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, plan_id):
        plan = Plan.objects.filter(id=plan_id).first()
        if plan is None:
            return Response({"detail": "Not found."}, status=404)
        _audit(
            request.user,
            "PLAN_DETAIL_VIEWED",
            event_type="plan",
            target=str(plan.id),
        )
        return Response(_serialize_plan(plan))

    def patch(self, request, plan_id):
        plan = Plan.objects.filter(id=plan_id).first()
        if plan is None:
            return Response({"detail": "Not found."}, status=404)
        
        data = request.data
        if "name" in data:
            plan.name = data["name"]
        if "code" in data:
            if Plan.objects.filter(code=data["code"]).exclude(id=plan.id).exists():
                return Response({"detail": "Plan with this code already exists."}, status=400)
            plan.code = data["code"]
        if "amount" in data:
            plan.amount = data["amount"]
        if "billing_interval" in data:
            plan.billing_interval = data["billing_interval"]
        if "is_active" in data:
            plan.is_active = data["is_active"]
        if "currency" in data:
            plan.currency = data["currency"]
        plan.save()

        _audit(
            request.user,
            "PLAN_UPDATED",
            event_type="plan",
            target=str(plan.id),
        )
        return Response(_serialize_plan(plan))


class AdminPlanEnableView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, plan_id):
        plan = Plan.objects.filter(id=plan_id).first()
        if plan is None:
            return Response({"detail": "Not found."}, status=404)
        plan.is_active = True
        plan.save()
        _audit(
            request.user,
            "PLAN_ENABLED",
            event_type="plan",
            target=str(plan.id),
        )
        return Response(_serialize_plan(plan), status=200)


class AdminPlanDisableView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, plan_id):
        plan = Plan.objects.filter(id=plan_id).first()
        if plan is None:
            return Response({"detail": "Not found."}, status=404)
        plan.is_active = False
        plan.save()
        _audit(
            request.user,
            "PLAN_DISABLED",
            event_type="plan",
            target=str(plan.id),
        )
        return Response(_serialize_plan(plan), status=200)


def _serialize_payment(payment):
    subscription = payment.subscription
    business = subscription.business if subscription else None
    owner = business.owner if business else None
    plan = payment.plan
    return {
        "id": str(payment.id),
        "subscription_id": str(subscription.id) if subscription else None,
        "business_id": str(business.id) if business else None,
        "business_name": business.name if business else None,
        "owner_id": str(owner.id) if owner else None,
        "owner_email": owner.email if owner else None,
        "plan": {
            "id": str(plan.id),
            "name": plan.name,
            "code": plan.code,
            "amount": str(plan.amount),
            "currency": plan.currency,
            "billing_interval": plan.billing_interval,
        } if plan else None,
        "amount": str(payment.amount),
        "currency": payment.currency,
        "status": payment.status,
        "provider": payment.provider,
        "provider_reference": payment.provider_reference,
        "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
        "updated_at": payment.updated_at.isoformat() if payment.updated_at else None,
    }


class AdminPaymentListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        payments = Payment.objects.select_related("subscription__business__owner", "plan").all().order_by("-created_at")
        _audit(request.user, "PAYMENT_LIST_VIEWED", event_type="payment")
        return Response([_serialize_payment(p) for p in payments])


class AdminPaymentDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, payment_id):
        payment = Payment.objects.select_related("subscription__business__owner", "plan").filter(id=payment_id).first()
        if payment is None:
            return Response({"detail": "Not found."}, status=404)
        _audit(request.user, "PAYMENT_DETAIL_VIEWED", event_type="payment", target=str(payment.id))
        return Response(_serialize_payment(payment))


class AdminBillingSummaryView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        payments = Payment.objects.all()
        total_payments = payments.count()
        paid_payments = payments.filter(status=Payment.Status.PAID)
        total_paid = paid_payments.count()
        pending_count = payments.filter(status=Payment.Status.PENDING).count()
        failed_count = payments.filter(status=Payment.Status.FAILED).count()
        expired_count = payments.filter(status=Payment.Status.EXPIRED).count()
        canceled_count = payments.filter(status=Payment.Status.CANCELED).count()

        valid_paid_revenue = sum((p.amount for p in paid_payments), start=0)

        _audit(request.user, "BILLING_SUMMARY_VIEWED", event_type="billing")
        return Response({
            "total_payments": total_payments,
            "total_paid_payments": total_paid,
            "total_pending": pending_count,
            "total_failed": failed_count,
            "total_expired": expired_count,
            "total_canceled": canceled_count,
            "valid_paid_revenue": str(valid_paid_revenue),
        })
