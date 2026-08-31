def is_feature_enabled(business, feature_code):
    """Centralized deterministic feature entitlement resolver.

    Precedence:
    1. Module inactive -> False
    2. Feature inactive -> False
    3. BusinessFeatureOverride: ENABLED -> True, DISABLED -> False, INHERIT -> continue
    4. Effective active Plan: active Subscription -> latest successful PAID Payment -> Payment.plan -> PlanFeature.is_enabled
    5. Feature default -> fallback (True if active, or feature.is_active)
    """
    from apps.admin.models import Feature, BusinessFeatureOverride, PlanFeature
    from apps.business.models import Subscription
    from apps.billing.models import Payment

    feature = Feature.objects.select_related("module").filter(code=feature_code).first()
    if not feature or not feature.is_active:
        return False
    if feature.module and not feature.module.is_active:
        return False

    # Check Business Feature Override
    override = BusinessFeatureOverride.objects.filter(business=business, feature=feature).first()
    if override:
        if override.state == BusinessFeatureOverride.State.ENABLED:
            return True
        if override.state == BusinessFeatureOverride.State.DISABLED:
            return False
        # If INHERIT, continue to Plan entitlement

    # Resolve Effective Active Plan
    from django.utils import timezone
    now = timezone.now()
    active_sub = Subscription.objects.filter(
        business=business,
        status="ACTIVE",
        period_end__isnull=True,
    ).first()
    if not active_sub:
        active_sub = Subscription.objects.filter(
            business=business,
            status="ACTIVE",
            period_end__gt=now,
        ).first()
    if active_sub:
        latest_payment = Payment.objects.filter(
            subscription=active_sub,
            status=Payment.Status.PAID,
        ).order_by("-created_at").first()
        if latest_payment and latest_payment.plan:
            plan_feature = PlanFeature.objects.filter(
                plan=latest_payment.plan,
                feature=feature,
            ).first()
            if plan_feature:
                return plan_feature.is_enabled

    # Feature default fallback
    return feature.is_active
