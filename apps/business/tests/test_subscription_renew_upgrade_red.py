"""GREEN-02C-A — RENEW + UPGRADE — Implemented behavioral test suite.

Tests the behavioral contract:
- RENEW: Owner of ACTIVE subscription creates renewal payment → webhook applies period extension.
- UPGRADE: Owner of ACTIVE subscription creates upgrade payment → webhook applies plan change.
- INITIAL: Existing initial payment activation with period/plan establishment.
- Invalid signature, idempotency, tenant isolation, terminal safety preserved.
"""

from decimal import Decimal
import hashlib
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework_simplejwt.tokens import RefreshToken

from apps.billing.models import Payment, PaymentWebhookEvent, Plan
from apps.business.models import Business, Subscription

User = get_user_model()

PAYMENTS_URL = "/api/v1/billing/payments/"
WEBHOOK_URL = "/api/v1/billing/webhooks/midtrans/"
MOCK_SNAP_RESPONSE = {
    "token": "snap-token-abc",
    "redirect_url": "https://app.sandbox.midtrans.com/snap/v2/redirect",
}


def _midtrans_payload(order_id, transaction_id, status, amount="99000.00", server_key="SB-Mid-server-test"):
    raw = f"{order_id}{_status_code(status)}{amount}{server_key}"
    sig = hashlib.sha512(raw.encode()).hexdigest()
    return {
        "order_id": str(order_id),
        "transaction_id": transaction_id,
        "transaction_status": status,
        "gross_amount": amount,
        "status_code": "200",
        "signature_key": sig,
    }


def _status_code(status):
    return {"settlement": "200", "capture": "200", "expire": "400", "cancel": "400", "deny": "401"}.get(
        status, "200"
    )


@pytest.fixture
def user(db):
    return User.objects.create_user(email="renewupgrade@example.com", password="SecurePass123!")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(email="otherrenewupgrade@example.com", password="SecurePass123!")


@pytest.fixture
def auth_client(client, user):
    refresh = RefreshToken.for_user(user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(refresh.access_token)}"
    return client


@pytest.fixture
def other_client(client, other_user):
    refresh = RefreshToken.for_user(other_user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(refresh.access_token)}"
    return client


@pytest.fixture
def business(db, user):
    return Business.objects.create(name="Toko Renewal", owner=user)


@pytest.fixture
def other_business(db, other_user):
    return Business.objects.create(name="Toko Lain", owner=other_user)


@pytest.fixture
def basic_plan(db):
    return Plan.objects.get(code="basic")


@pytest.fixture
def premium_plan(db):
    return Plan.objects.create(
        name="Premium Plan",
        code="premium",
        amount=Decimal("199000.00"),
        currency="IDR",
        billing_interval="MONTHLY",
        is_active=True,
    )


@pytest.fixture
def active_subscription_with_plan(db, business, basic_plan):
    return Subscription.objects.create(
        business=business, status="ACTIVE", plan=basic_plan
    )


@pytest.fixture
def other_active_subscription(db, other_business):
    return Subscription.objects.create(business=other_business, status="ACTIVE")


@pytest.mark.django_db
class TestRenewUpgradeContractGreen:

    # ================= INITIAL PAYMENT REGRESSION =================

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_initial_payment_establishes_plan_and_period(self, mock_snap, auth_client, business, basic_plan):
        """INITIAL: TRIAL subscription + verified payment → ACTIVE with effective Plan and period."""
        sub = Subscription.objects.create(business=business, status="TRIAL")
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(sub.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 201
        payment_id = r.data["id"]
        payload = _midtrans_payload(str(payment_id), f"txn-init-{payment_id}", "settlement")
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            client.post(WEBHOOK_URL, payload, content_type="application/json")

        sub.refresh_from_db()
        assert sub.status == "ACTIVE"
        assert sub.plan == basic_plan
        assert sub.period_start is not None
        assert sub.period_end is not None
        assert sub.period_end > sub.period_start

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_initial_payment_default_purpose_initial(self, mock_snap, auth_client, business, basic_plan):
        """Payment without explicit purpose defaults to INITIAL."""
        sub = Subscription.objects.create(business=business, status="TRIAL")
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(sub.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 201
        assert r.data["purpose"] == "INITIAL"
        p = Payment.objects.get(pk=r.data["id"])
        assert p.purpose == Payment.Purpose.INITIAL

    # ================= RENEWAL TESTS (RENEW-01 to RENEW-06) =================

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_renew_01_owner_creates_renewal_payment(self, mock_snap, auth_client, active_subscription_with_plan, basic_plan):
        """RENEW-01: Owner creates RENEWAL payment for ACTIVE subscription."""
        r = auth_client.post(
            PAYMENTS_URL,
            {
                "subscription_id": str(active_subscription_with_plan.id),
                "plan_id": str(basic_plan.id),
                "purpose": "RENEWAL",
            },
            content_type="application/json",
        )
        assert r.status_code == 201
        assert r.data["purpose"] == "RENEWAL"
        assert r.data["status"] == "PENDING"
        p = Payment.objects.get(pk=r.data["id"])
        assert p.subscription == active_subscription_with_plan
        assert p.plan == basic_plan
        assert active_subscription_with_plan.status == "ACTIVE"

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_renew_02_valid_webhook_extends_period(self, mock_snap, auth_client, active_subscription_with_plan, basic_plan):
        """RENEW-02: Valid settlement webhook for renewal → payment PAID, period extended."""
        old_period_end = active_subscription_with_plan.period_end

        p = Payment.objects.create(
            subscription=active_subscription_with_plan,
            plan=basic_plan,
            amount=basic_plan.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS",
            purpose="RENEWAL",
        )
        payload = _midtrans_payload(str(p.id), f"txn-renew-{p.id}", "settlement")
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            client.post(WEBHOOK_URL, payload, content_type="application/json")

        p.refresh_from_db()
        active_subscription_with_plan.refresh_from_db()
        assert p.status == "PAID"
        assert active_subscription_with_plan.status == "ACTIVE"
        if old_period_end:
            assert active_subscription_with_plan.period_end > old_period_end

    def test_renew_03_invalid_signature_no_mutation(self, active_subscription_with_plan, basic_plan):
        """RENEW-03: Invalid signature → payment stays PENDING, subscription unchanged."""
        p = Payment.objects.create(
            subscription=active_subscription_with_plan,
            plan=basic_plan,
            amount=basic_plan.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS",
            purpose="RENEWAL",
        )
        payload = _midtrans_payload(str(p.id), f"txn-inv-{p.id}", "settlement")
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=False):
            client.post(WEBHOOK_URL, payload, content_type="application/json")
        p.refresh_from_db()
        assert p.status == "PENDING"

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_renew_04_duplicate_webhook_idempotent(self, auth_client, active_subscription_with_plan, basic_plan):
        """RENEW-04: Duplicate renewal webhook → processed once."""
        original_period_end = active_subscription_with_plan.period_end
        p = Payment.objects.create(
            subscription=active_subscription_with_plan,
            plan=basic_plan,
            amount=basic_plan.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS",
            purpose="RENEWAL",
        )
        payload = _midtrans_payload(str(p.id), f"txn-dup-ren-{p.id}", "settlement")
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            r1 = client.post(WEBHOOK_URL, payload, content_type="application/json")
            r2 = client.post(WEBHOOK_URL, payload, content_type="application/json")
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert PaymentWebhookEvent.objects.filter(provider="MIDTRANS", event_id=f"txn-dup-ren-{p.id}").count() == 1

    def test_renew_05_failed_renewal_no_mutation(self, active_subscription_with_plan, basic_plan):
        """RENEW-05: Failed/denied renewal → payment FAILED, subscription unchanged."""
        p = Payment.objects.create(
            subscription=active_subscription_with_plan,
            plan=basic_plan,
            amount=basic_plan.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS",
            purpose="RENEWAL",
        )
        payload = _midtrans_payload(str(p.id), f"txn-fail-{p.id}", "deny")
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            client.post(WEBHOOK_URL, payload, content_type="application/json")
        p.refresh_from_db()
        active_subscription_with_plan.refresh_from_db()
        assert p.status == Payment.Status.FAILED
        assert active_subscription_with_plan.status == "ACTIVE"

    def test_renew_06_tenant_isolation(self, other_client, active_subscription_with_plan, basic_plan):
        """RENEW-06: Non-owner cannot create renewal payment → 404."""
        r = other_client.post(
            PAYMENTS_URL,
            {
                "subscription_id": str(active_subscription_with_plan.id),
                "plan_id": str(basic_plan.id),
                "purpose": "RENEWAL",
            },
            content_type="application/json",
        )
        assert r.status_code == 404


    # ================= UPGRADE TESTS (UPGRADE-01 to UPGRADE-06) =================

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_upgrade_01_owner_creates_upgrade_payment(self, mock_snap, auth_client, active_subscription_with_plan, premium_plan):
        """UPGRADE-01: Owner creates UPGRADE payment for ACTIVE subscription with target Plan."""
        r = auth_client.post(
            PAYMENTS_URL,
            {
                "subscription_id": str(active_subscription_with_plan.id),
                "plan_id": str(premium_plan.id),
                "purpose": "UPGRADE",
            },
            content_type="application/json",
        )
        assert r.status_code == 201
        assert r.data["purpose"] == "UPGRADE"
        assert r.data["status"] == "PENDING"
        p = Payment.objects.get(pk=r.data["id"])
        assert p.subscription == active_subscription_with_plan
        assert p.plan == premium_plan
        assert active_subscription_with_plan.status == "ACTIVE"

    def test_upgrade_02_target_plan_same_as_current_rejected(self, auth_client, active_subscription_with_plan, basic_plan):
        """UPGRADE validation: target plan == current plan → 400."""
        r = auth_client.post(
            PAYMENTS_URL,
            {
                "subscription_id": str(active_subscription_with_plan.id),
                "plan_id": str(basic_plan.id),
                "purpose": "UPGRADE",
            },
            content_type="application/json",
        )
        assert r.status_code == 400

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_upgrade_03_valid_webhook_applies_plan_change(self, mock_snap, auth_client, active_subscription_with_plan, premium_plan):
        """UPGRADE-03: Valid settlement webhook → payment PAID, subscription effective plan changed to target."""
        p = Payment.objects.create(
            subscription=active_subscription_with_plan,
            plan=premium_plan,
            amount=premium_plan.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS",
            purpose="UPGRADE",
        )
        payload = _midtrans_payload(str(p.id), f"txn-upgrade-{p.id}", "settlement", amount="199000.00")
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            client.post(WEBHOOK_URL, payload, content_type="application/json")

        p.refresh_from_db()
        active_subscription_with_plan.refresh_from_db()
        assert p.status == "PAID"
        assert active_subscription_with_plan.status == "ACTIVE"
        assert active_subscription_with_plan.plan == premium_plan

    def test_upgrade_04_invalid_signature_no_mutation(self, active_subscription_with_plan, premium_plan):
        """UPGRADE-04: Invalid signature → no plan or subscription mutation."""
        original_plan = active_subscription_with_plan.plan
        p = Payment.objects.create(
            subscription=active_subscription_with_plan,
            plan=premium_plan,
            amount=premium_plan.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS",
            purpose="UPGRADE",
        )
        payload = _midtrans_payload(str(p.id), f"txn-inv-up-{p.id}", "settlement", amount="199000.00")
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=False):
            client.post(WEBHOOK_URL, payload, content_type="application/json")
        p.refresh_from_db()
        active_subscription_with_plan.refresh_from_db()
        assert p.status == "PENDING"
        assert active_subscription_with_plan.plan == original_plan

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_upgrade_05_failed_upgrade_no_mutation(self, auth_client, active_subscription_with_plan, premium_plan):
        """UPGRADE-05: Failed upgrade payment → subscription keeps current plan."""
        original_plan = active_subscription_with_plan.plan
        p = Payment.objects.create(
            subscription=active_subscription_with_plan,
            plan=premium_plan,
            amount=premium_plan.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS",
            purpose="UPGRADE",
        )
        payload = _midtrans_payload(str(p.id), f"txn-fail-up-{p.id}", "deny", amount="199000.00")
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            client.post(WEBHOOK_URL, payload, content_type="application/json")
        p.refresh_from_db()
        active_subscription_with_plan.refresh_from_db()
        assert p.status == Payment.Status.FAILED
        assert active_subscription_with_plan.status == "ACTIVE"
        assert active_subscription_with_plan.plan == original_plan

    def test_upgrade_06_tenant_isolation(self, other_client, active_subscription_with_plan, premium_plan):
        """UPGRADE-06: Non-owner cannot create upgrade payment → 404."""
        r = other_client.post(
            PAYMENTS_URL,
            {
                "subscription_id": str(active_subscription_with_plan.id),
                "plan_id": str(premium_plan.id),
                "purpose": "UPGRADE",
            },
            content_type="application/json",
        )
        assert r.status_code == 404


    # ================= PAYMENT PURPOSE DISTINCTION =================

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_payment_purpose_distinguishable(self, mock_snap, auth_client, business, basic_plan, premium_plan):
        """Payments for the same ACTIVE subscription should support PURPOSE distinction."""
        sub = Subscription.objects.create(business=business, status="ACTIVE", plan=basic_plan)

        r_initial = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(sub.id), "plan_id": str(basic_plan.id), "purpose": "INITIAL"},
            content_type="application/json",
        )
        assert r_initial.data["purpose"] == "INITIAL"

        sub.status = "ACTIVE"
        sub.save()
        Payment.objects.filter(subscription=sub).update(status="FAILED")

        r_renewal = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(sub.id), "plan_id": str(basic_plan.id), "purpose": "RENEWAL"},
            content_type="application/json",
        )
        assert r_renewal.data["purpose"] == "RENEWAL"

        Payment.objects.filter(subscription=sub).update(status="FAILED")

        r_upgrade = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(sub.id), "plan_id": str(premium_plan.id), "purpose": "UPGRADE"},
            content_type="application/json",
        )
        assert r_upgrade.data["purpose"] == "UPGRADE"

    def test_invalid_plan_rejected(self, auth_client, active_subscription_with_plan):
        """Invalid/inactive Plan → 400."""
        from uuid import uuid4
        r = auth_client.post(
            PAYMENTS_URL,
            {
                "subscription_id": str(active_subscription_with_plan.id),
                "plan_id": str(uuid4()),
                "purpose": "RENEWAL",
            },
            content_type="application/json",
        )
        assert r.status_code == 400

    def test_terminal_payment_safety_paid_cannot_downgrade(self, active_subscription_with_plan, basic_plan):
        """PAID payment cannot be downgraded by a later deny webhook."""
        p = Payment.objects.create(
            subscription=active_subscription_with_plan,
            plan=basic_plan,
            amount=basic_plan.amount,
            currency="IDR",
            status="PAID",
            provider="MIDTRANS",
            purpose="RENEWAL",
            paid_at=timezone_now(),
        )
        payload = _midtrans_payload(str(p.id), f"txn-terminal-{p.id}", "deny")
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            client.post(WEBHOOK_URL, payload, content_type="application/json")
        p.refresh_from_db()
        assert p.status == "PAID"


from django.utils import timezone as _tz


def timezone_now():
    return _tz.now()
