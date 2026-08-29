from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admin.permissions import IsSuperAdmin
from apps.admin.models import (
    Module,
    Feature,
    PlanFeature,
    BusinessFeatureOverride,
    SupportTicket,
    TicketReply,
)
from apps.admin.serializers import (
    ModuleSerializer,
    FeatureSerializer,
    PlanFeatureSerializer,
    BusinessFeatureOverrideSerializer,
    SupportTicketListSerializer,
    SupportTicketDetailSerializer,
    SupportTicketWriteSerializer,
    TicketReplySerializer,
)
from apps.admin.serializers import (
    ModuleSerializer,
    FeatureSerializer,
    PlanFeatureSerializer,
    BusinessFeatureOverrideSerializer,
)
from apps.authentication.models import User
from apps.business.models import Business, Subscription, BusinessMembership
from apps.employee.models import Employee
from apps.audit.models import AuditLog
from apps.billing.models import Plan, Payment


def _audit(actor, action, **kwargs):
    AuditLog.objects.create(actor=actor, action=action, **kwargs)


# =====================================================================
# DOMAIN 10 — FEATURE & MODULE MANAGEMENT
# =====================================================================


class AdminModuleListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        modules = Module.objects.all().order_by("-created_at")
        _audit(request.user, "MODULE_LIST_VIEWED", event_type="module")
        return Response(ModuleSerializer(modules, many=True).data)

    def post(self, request):
        serializer = ModuleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        module = serializer.save()
        _audit(
            request.user,
            "MODULE_CREATED",
            event_type="module",
            target=str(module.id),
        )
        return Response(ModuleSerializer(module).data, status=201)


class AdminModuleDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get_object(self, module_id):
        return Module.objects.filter(id=module_id).first()

    def get(self, request, module_id):
        module = self.get_object(module_id)
        if module is None:
            return Response({"detail": "Not found."}, status=404)
        _audit(
            request.user,
            "MODULE_DETAIL_VIEWED",
            event_type="module",
            target=str(module.id),
        )
        return Response(ModuleSerializer(module).data)

    def patch(self, request, module_id):
        module = self.get_object(module_id)
        if module is None:
            return Response({"detail": "Not found."}, status=404)
        serializer = ModuleSerializer(module, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        module = serializer.save()
        _audit(
            request.user,
            "MODULE_UPDATED",
            event_type="module",
            target=str(module.id),
        )
        return Response(ModuleSerializer(module).data)


class AdminModuleEnableView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, module_id):
        module = Module.objects.filter(id=module_id).first()
        if module is None:
            return Response({"detail": "Not found."}, status=404)
        module.is_active = True
        module.save(update_fields=["is_active", "updated_at"])
        _audit(
            request.user,
            "MODULE_ENABLED",
            event_type="module",
            target=str(module.id),
        )
        return Response(ModuleSerializer(module).data)


class AdminModuleDisableView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, module_id):
        module = Module.objects.filter(id=module_id).first()
        if module is None:
            return Response({"detail": "Not found."}, status=404)
        module.is_active = False
        module.save(update_fields=["is_active", "updated_at"])
        _audit(
            request.user,
            "MODULE_DISABLED",
            event_type="module",
            target=str(module.id),
        )
        return Response(ModuleSerializer(module).data)


class AdminFeatureListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        features = Feature.objects.select_related("module").all().order_by("-created_at")
        _audit(request.user, "FEATURE_LIST_VIEWED", event_type="feature")
        return Response(FeatureSerializer(features, many=True).data)

    def post(self, request):
        serializer = FeatureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        feature = serializer.save()
        _audit(
            request.user,
            "FEATURE_CREATED",
            event_type="feature",
            target=str(feature.id),
        )
        return Response(FeatureSerializer(feature).data, status=201)


class AdminFeatureDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get_object(self, feature_id):
        return Feature.objects.filter(id=feature_id).first()

    def get(self, request, feature_id):
        feature = self.get_object(feature_id)
        if feature is None:
            return Response({"detail": "Not found."}, status=404)
        _audit(
            request.user,
            "FEATURE_DETAIL_VIEWED",
            event_type="feature",
            target=str(feature.id),
        )
        return Response(FeatureSerializer(feature).data)

    def patch(self, request, feature_id):
        feature = self.get_object(feature_id)
        if feature is None:
            return Response({"detail": "Not found."}, status=404)
        serializer = FeatureSerializer(feature, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        feature = serializer.save()
        _audit(
            request.user,
            "FEATURE_UPDATED",
            event_type="feature",
            target=str(feature.id),
        )
        return Response(FeatureSerializer(feature).data)


class AdminFeatureEnableView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, feature_id):
        feature = Feature.objects.filter(id=feature_id).first()
        if feature is None:
            return Response({"detail": "Not found."}, status=404)
        feature.is_active = True
        feature.save(update_fields=["is_active", "updated_at"])
        _audit(
            request.user,
            "FEATURE_ENABLED",
            event_type="feature",
            target=str(feature.id),
        )
        return Response(FeatureSerializer(feature).data)


class AdminFeatureDisableView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, feature_id):
        feature = Feature.objects.filter(id=feature_id).first()
        if feature is None:
            return Response({"detail": "Not found."}, status=404)
        feature.is_active = False
        feature.save(update_fields=["is_active", "updated_at"])
        _audit(
            request.user,
            "FEATURE_DISABLED",
            event_type="feature",
            target=str(feature.id),
        )
        return Response(FeatureSerializer(feature).data)


class AdminPlanFeatureListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, plan_id):
        plan = Plan.objects.filter(id=plan_id).first()
        if plan is None:
            return Response({"detail": "Not found."}, status=404)
        plan_features = plan.plan_features.select_related("feature").all().order_by("-created_at")
        _audit(
            request.user,
            "PLAN_FEATURE_LIST_VIEWED",
            event_type="plan_feature",
            target=str(plan.id),
        )
        return Response(PlanFeatureSerializer(plan_features, many=True).data)

    def post(self, request, plan_id):
        plan = Plan.objects.filter(id=plan_id).first()
        if plan is None:
            return Response({"detail": "Not found."}, status=404)

        feature_id = request.data.get("feature")
        if not feature_id:
            return Response({"detail": "feature is required."}, status=400)

        feature = Feature.objects.filter(id=feature_id).first()
        if feature is None:
            return Response({"detail": "Feature not found."}, status=404)

        if PlanFeature.objects.filter(plan=plan, feature=feature).exists():
            return Response(
                {"detail": "PlanFeature for this plan and feature already exists."},
                status=400,
            )

        plan_feature = PlanFeature.objects.create(
            plan=plan,
            feature=feature,
            is_enabled=request.data.get("is_enabled", True),
        )
        _audit(
            request.user,
            "PLAN_FEATURE_CREATED",
            event_type="plan_feature",
            target=str(plan_feature.id),
        )
        return Response(PlanFeatureSerializer(plan_feature).data, status=201)


class AdminPlanFeatureDeleteView(APIView):
    permission_classes = [IsSuperAdmin]

    def delete(self, request, plan_id, feature_id):
        plan = Plan.objects.filter(id=plan_id).first()
        if plan is None:
            return Response({"detail": "Not found."}, status=404)

        plan_feature = PlanFeature.objects.filter(plan=plan, feature=feature_id).first()
        if plan_feature is None:
            return Response({"detail": "Not found."}, status=404)

        plan_feature.delete()
        _audit(
            request.user,
            "PLAN_FEATURE_DELETED",
            event_type="plan_feature",
            target=str(plan_feature.id),
        )
        return Response(status=204)


class AdminBusinessFeatureListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, business_id):
        business = Business.objects.filter(id=business_id).first()
        if business is None:
            return Response({"detail": "Not found."}, status=404)

        overrides = (
            business.feature_overrides.select_related("feature", "feature__module")
            .all()
            .order_by("-created_at")
        )
        _audit(
            request.user,
            "BUSINESS_FEATURE_LIST_VIEWED",
            event_type="business_feature",
            target=str(business.id),
        )
        return Response(BusinessFeatureOverrideSerializer(overrides, many=True).data)

    def patch(self, request, business_id, feature_id):
        business = Business.objects.filter(id=business_id).first()
        if business is None:
            return Response({"detail": "Not found."}, status=404)

        feature = Feature.objects.filter(id=feature_id).first()
        if feature is None:
            return Response({"detail": "Feature not found."}, status=404)

        state = request.data.get("state")
        if state not in [s[0] for s in BusinessFeatureOverride.State.choices]:
            return Response({"detail": "Invalid state."}, status=400)

        override, _ = BusinessFeatureOverride.objects.get_or_create(
            business=business,
            feature=feature,
            defaults={"state": state},
        )
        if override.state != state:
            override.state = state
            override.save(update_fields=["state", "updated_at"])

        _audit(
            request.user,
            "BUSINESS_FEATURE_OVERRIDE_UPDATED",
            event_type="business_feature",
            target=str(business.id),
        )
        return Response(BusinessFeatureOverrideSerializer(override).data)


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


# =====================================================================
# DOMAIN 01 — SUPER ADMIN DASHBOARD (PLATFORM-LEVEL READ-ONLY OVERVIEW)
# =====================================================================


class AdminDashboardView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from django.db import connection

        owners = User.objects.filter(businesses__isnull=False).distinct()
        total_accounts = owners.count()
        total_owners = owners.count()
        total_businesses = Business.objects.count()
        total_users = User.objects.count()
        active_subscriptions = Subscription.objects.filter(status=Subscription.Status.ACTIVE).count()

        paid_payments = Payment.objects.filter(status=Payment.Status.PAID)
        valid_paid_revenue = sum((p.amount for p in paid_payments), start=0)
        total_paid_payments = paid_payments.count()
        total_pending = Payment.objects.filter(status=Payment.Status.PENDING).count()
        total_failed = Payment.objects.filter(status=Payment.Status.FAILED).count()
        total_expired = Payment.objects.filter(status=Payment.Status.EXPIRED).count()
        total_canceled = Payment.objects.filter(status=Payment.Status.CANCELED).count()

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            db_status = "ok"
        except Exception:
            db_status = "error"

        system_status = {
            "status": "ok" if db_status == "ok" else "error",
            "application": {"status": "ok"},
            "database": {"status": db_status},
            "dependencies": [{"name": "postgresql", "status": db_status}],
        }

        _audit(request.user, "DASHBOARD_VIEWED", event_type="dashboard")
        return Response({
            "total_accounts": total_accounts,
            "total_owners": total_owners,
            "total_businesses": total_businesses,
            "total_users": total_users,
            "active_subscriptions": active_subscriptions,
            "revenue_summary": {
                "total_paid_revenue": str(valid_paid_revenue),
                "total_paid_payments": total_paid_payments,
                "total_pending": total_pending,
                "total_failed": total_failed,
                "total_expired": total_expired,
                "total_canceled": total_canceled,
            },
            "system_status": system_status,
        })


# =====================================================================
# DOMAIN 08 — SUPPORT CENTER (PLATFORM SUPER ADMIN)
# =====================================================================


class AdminSupportTicketListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        tickets = SupportTicket.objects.select_related("requester").all().order_by("-created_at")
        _audit(request.user, "SUPPORT_TICKET_LIST_VIEWED", event_type="support")
        serializer = SupportTicketListSerializer(tickets, many=True)
        return Response({"results": serializer.data})

    def post(self, request):
        serializer = SupportTicketWriteSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save()
        _audit(
            request.user,
            "SUPPORT_TICKET_CREATED",
            event_type="support",
            target=str(ticket.id),
        )
        return Response(SupportTicketDetailSerializer(ticket).data, status=201)


class AdminSupportTicketDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get_object(self, ticket_id):
        return SupportTicket.objects.filter(id=ticket_id).first()

    def get(self, request, ticket_id):
        ticket = self.get_object(ticket_id)
        if ticket is None:
            return Response({"detail": "Not found."}, status=404)
        _audit(
            request.user,
            "SUPPORT_TICKET_DETAIL_VIEWED",
            event_type="support",
            target=str(ticket.id),
        )
        return Response(SupportTicketDetailSerializer(ticket).data)

    def patch(self, request, ticket_id):
        ticket = self.get_object(ticket_id)
        if ticket is None:
            return Response({"detail": "Not found."}, status=404)
        serializer = SupportTicketWriteSerializer(
            ticket,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save()
        _audit(
            request.user,
            "SUPPORT_TICKET_UPDATED",
            event_type="support",
            target=str(ticket.id),
        )
        return Response(SupportTicketDetailSerializer(ticket).data)


class AdminSupportTicketReplyView(APIView):
    permission_classes = [IsSuperAdmin]

    def get_object(self, ticket_id):
        return SupportTicket.objects.filter(id=ticket_id).first()

    def get(self, request, ticket_id):
        ticket = self.get_object(ticket_id)
        if ticket is None:
            return Response({"detail": "Not found."}, status=404)
        replies = ticket.replies.select_related("author").all()
        _audit(
            request.user,
            "SUPPORT_TICKET_REPLIES_VIEWED",
            event_type="support",
            target=str(ticket.id),
        )
        return Response(TicketReplySerializer(replies, many=True).data)

    def post(self, request, ticket_id):
        ticket = self.get_object(ticket_id)
        if ticket is None:
            return Response({"detail": "Not found."}, status=404)
        serializer = TicketReplySerializer(
            data=request.data,
            context={"request": request, "ticket": ticket},
        )
        serializer.is_valid(raise_exception=True)
        reply = serializer.save()
        _audit(
            request.user,
            "SUPPORT_TICKET_REPLIED",
            event_type="support",
            target=str(ticket.id),
        )
        return Response(TicketReplySerializer(reply).data, status=201)
