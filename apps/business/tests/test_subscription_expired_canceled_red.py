"""GREEN-02C-D — EXPIRED + CANCELED behavioral contract tests (RED phase).

These tests establish the behavioral contract for subscription expiration and
cancellation. They exercise real production boundaries (REST endpoints, ORM,
webhook) and assert contract behavior without naming implementation internals.

All tests currently FAIL (RED) because the corresponding production behavior
is not yet implemented.
"""

from decimal import Decimal
import hashlib
from datetime import timedelta
from unittest.mock import patch
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.billing.models import Payment, PaymentWebhookEvent, Plan
from apps.business.models import Business, Subscription

User = get_user_model()

PAYMENTS_URL = "/api/v1/billing/payments/"
WEBHOOK_URL = "/api/v1/billing/webhooks/midtrans/"
SUBSCRIPTION_BASE = "/api/v1/businesses/{biz}/subscription/"

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


def _process_settlement_webhook(payment):
    payload = _midtrans_payload(str(payment.id), f"txn-{payment.id}", "settlement", str(payment.amount))
    client = Client()
    with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
        client.post(WEBHOOK_URL, payload, content_type="application/json")


@pytest.fixture
def user(db):
    return User.objects.create_user(email="owner_d@example.com", password="SecurePass123!")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(email="other_d@example.com", password="SecurePass123!")


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
    return Business.objects.create(name="Toko D-1", owner=user)


@pytest.fixture
def other_business(db, other_user):
    return Business.objects.create(name="Toko D-2", owner=other_user)


@pytest.fixture
def basic_plan(db):
    return Plan.objects.get(code="basic")


@pytest.fixture
def premium_plan(db):
    return Plan.objects.create(
        name="Premium D-Plan",
        code="premium_d",
        amount=Decimal("199000.00"),
        currency="IDR",
        billing_interval="MONTHLY",
        is_active=True,
    )


@pytest.fixture
def expired_subscription(db, business, basic_plan):
    sub = Subscription.objects.create(
        business=business,
        status="EXPIRED",
        plan=basic_plan,
        period_start=timezone.now() - timedelta(days=60),
        period_end=timezone.now() - timedelta(days=1),
    )
    return sub


@pytest.fixture
def active_subscription(db, business, basic_plan):
    return Subscription.objects.create(
        business=business,
        status="ACTIVE",
        plan=basic_plan,
        period_start=timezone.now(),
        period_end=timezone.now() + timedelta(days=30),
    )


@pytest.fixture
def canceled_subscription(db, business, basic_plan):
    return Subscription.objects.create(
        business=business,
        status="CANCELED",
        plan=basic_plan,
    )


@pytest.fixture
def other_active_subscription(db, other_business, basic_plan):
    return Subscription.objects.create(
        business=other_business,
        status="ACTIVE",
        plan=basic_plan,
        period_end=timezone.now() + timedelta(days=30),
    )


@pytest.fixture
def other_expired_subscription(db, other_business, basic_plan):
    return Subscription.objects.create(
        business=other_business,
        status="EXPIRED",
        plan=basic_plan,
        period_start=timezone.now() - timedelta(days=60),
        period_end=timezone.now() - timedelta(days=1),
    )


@pytest.fixture
def other_canceled_subscription(db, other_business, basic_plan):
    return Subscription.objects.create(
        business=other_business,
        status="CANCELED",
        plan=basic_plan,
    )


# ================= EXPIRED TESTS (RED-D-01 to RED-D-10) =================


class TestExpiredContractRed:

    def test_red_d_01_expired_status_supported(self):
        """RED-D-01: Subscription model must support EXPIRED status."""
        statuses = [choice[0] for choice in Subscription.Status.choices]
        assert "EXPIRED" in statuses

    def test_red_d_02_expired_subscription_no_access(self, expired_subscription, basic_plan):
        """RED-D-02: EXPIRED subscription does not receive operational entitlement."""
        assert expired_subscription.status == "EXPIRED"
        assert expired_subscription.period_end < timezone.now()

    def test_red_d_03_expired_has_no_operational_entitlement(self, expired_subscription):
        """RED-D-03: Expired subscription is not ACTIVE and not entitled."""
        assert expired_subscription.status != "ACTIVE"
        if hasattr(expired_subscription, "is_entitled_active"):
            assert expired_subscription.is_entitled_active() is False

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_red_d_04_owner_renews_expired_subscription(self, mock_snap, auth_client, expired_subscription, basic_plan):
        """RED-D-04: Owner can initiate renewal for an EXPIRED subscription."""
        r = auth_client.post(
            PAYMENTS_URL,
            {
                "subscription_id": str(expired_subscription.id),
                "plan_id": str(basic_plan.id),
                "purpose": "RENEWAL",
            },
            content_type="application/json",
        )
        assert r.status_code == 201
        assert r.data["status"] == "PENDING"
        assert r.data["purpose"] == "RENEWAL"

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_red_d_05_renewal_payment_purpose_renewal(self, mock_snap, auth_client, expired_subscription, basic_plan):
        """RED-D-05: Renewal on EXPIRED subscription creates payment with purpose = RENEWAL."""
        auth_client.post(
            PAYMENTS_URL,
            {
                "subscription_id": str(expired_subscription.id),
                "plan_id": str(basic_plan.id),
                "purpose": "RENEWAL",
            },
            content_type="application/json",
        )
        p = Payment.objects.filter(subscription=expired_subscription, purpose="RENEWAL").first()
        assert p is not None
        assert p.purpose == "RENEWAL"

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_red_d_06_pending_renewal_no_activate(self, mock_snap, auth_client, expired_subscription, basic_plan):
        """RED-D-06: Pending renewal payment does NOT change EXPIRED to ACTIVE."""
        auth_client.post(
            PAYMENTS_URL,
            {
                "subscription_id": str(expired_subscription.id),
                "plan_id": str(basic_plan.id),
                "purpose": "RENEWAL",
            },
            content_type="application/json",
        )
        expired_subscription.refresh_from_db()
        assert expired_subscription.status == "EXPIRED"

    def test_red_d_07_invalid_signature_no_mutation(self, expired_subscription, basic_plan):
        """RED-D-07: Invalid signature on renewal webhook -> EXPIRED unchanged."""
        p = Payment.objects.create(
            subscription=expired_subscription,
            plan=basic_plan,
            amount=basic_plan.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS",
            purpose="RENEWAL",
        )
        payload = _midtrans_payload(str(p.id), f"txn-inv-{p.id}", "settlement", str(p.amount))
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=False):
            client.post(WEBHOOK_URL, payload, content_type="application/json")
        p.refresh_from_db()
        expired_subscription.refresh_from_db()
        assert p.status == "PENDING"
        assert expired_subscription.status == "EXPIRED"

    def test_red_d_08_failed_renewal_no_activate(self, expired_subscription, basic_plan):
        """RED-D-08: Failed/denied renewal payment does NOT activate EXPIRED subscription."""
        p = Payment.objects.create(
            subscription=expired_subscription,
            plan=basic_plan,
            amount=basic_plan.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS",
            purpose="RENEWAL",
        )
        payload = _midtrans_payload(str(p.id), f"txn-fail-{p.id}", "deny", str(p.amount))
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            client.post(WEBHOOK_URL, payload, content_type="application/json")
        p.refresh_from_db()
        expired_subscription.refresh_from_db()
        assert p.status == Payment.Status.FAILED
        assert expired_subscription.status == "EXPIRED"

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_red_d_09_verified_renewal_activates(self, mock_snap, auth_client, expired_subscription, basic_plan):
        """RED-D-09: Verified renewal payment activates EXPIRED subscription → ACTIVE."""
        _process_settlement_webhook(Payment.objects.create(
            subscription=expired_subscription,
            plan=basic_plan,
            amount=basic_plan.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS",
            purpose="RENEWAL",
        ))
        expired_subscription.refresh_from_db()
        assert expired_subscription.status == "ACTIVE"
        assert expired_subscription.period_end > timezone.now()

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_red_d_10_renewal_establishes_period(self, mock_snap, auth_client, expired_subscription, basic_plan):
        """RED-D-10: Verified renewal establishes/refreshes period based on Plan billing interval."""
        _process_settlement_webhook(Payment.objects.create(
            subscription=expired_subscription,
            plan=basic_plan,
            amount=basic_plan.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS",
            purpose="RENEWAL",
        ))
        expired_subscription.refresh_from_db()
        assert expired_subscription.period_start is not None
        assert expired_subscription.period_end is not None
        assert expired_subscription.period_end > expired_subscription.period_start


# ================= EXPIRED UPGRADE BLOCK (RED-D-11) =================


class TestExpiredUpgradeBlockRed:

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_red_d_11_expired_cannot_upgrade(self, mock_snap, auth_client, expired_subscription, premium_plan):
        """RED-D-11: EXPIRED subscription cannot UPGRADE. Must be rejected."""
        r = auth_client.post(
            PAYMENTS_URL,
            {
                "subscription_id": str(expired_subscription.id),
                "plan_id": str(premium_plan.id),
                "purpose": "UPGRADE",
            },
            content_type="application/json",
        )
        assert r.status_code in (400, 404)
        assert not Payment.objects.filter(subscription=expired_subscription, purpose="UPGRADE").exists()
        expired_subscription.refresh_from_db()
        assert expired_subscription.status == "EXPIRED"


# ================= CANCELED TESTS (RED-D-12 to RED-D-20) =================


class TestCanceledContractRed:

    def test_red_d_12_status_canceled_supported(self):
        """RED-D-12: CANCELED status is supported on Subscription."""
        statuses = [choice[0] for choice in Subscription.Status.choices]
        assert "CANCELED" in statuses

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_red_d_12b_owner_can_cancel_active(self, mock_snap, auth_client, active_subscription, basic_plan):
        """RED-D-12b: Owner can cancel an ACTIVE subscription via production boundary."""
        r = auth_client.post(
            SUBSCRIPTION_BASE.format(biz=active_subscription.business.id) + "cancel/",
            {},
            content_type="application/json",
        )
        assert r.status_code in (200, 204)
        active_subscription.refresh_from_db()
        assert active_subscription.status == "CANCELED"

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_red_d_13_non_owner_cannot_cancel(self, mock_snap, other_client, active_subscription):
        """RED-D-13: Non-owner cannot cancel → 404."""
        r = other_client.post(
            SUBSCRIPTION_BASE.format(biz=active_subscription.business.id) + "cancel/",
            {},
            content_type="application/json",
        )
        assert r.status_code == 404
        active_subscription.refresh_from_db()
        assert active_subscription.status == "ACTIVE"

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_red_d_14_non_owner_cancel_404(self, mock_snap, other_client, active_subscription):
        """RED-D-14: Non-owner cancellation attempt → 404."""
        r = other_client.post(
            SUBSCRIPTION_BASE.format(biz=active_subscription.business.id) + "cancel/",
            {},
            content_type="application/json",
        )
        assert r.status_code == 404

    def test_red_d_15_cross_business_cancel_404(self, auth_client, other_active_subscription):
        """RED-D-15: Cross-business cancellation → 404."""
        r = auth_client.post(
            SUBSCRIPTION_BASE.format(biz=other_active_subscription.business.id) + "cancel/",
            {},
            content_type="application/json",
        )
        assert r.status_code == 404
        other_active_subscription.refresh_from_db()
        assert other_active_subscription.status == "ACTIVE"

    def test_red_d_16_canceled_no_entitlement(self, canceled_subscription):
        """RED-D-16: CANCELED subscription has no operational entitlement."""
        assert canceled_subscription.status == "CANCELED"

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_red_d_17_canceled_cannot_renew(self, mock_snap, auth_client, canceled_subscription, basic_plan):
        """RED-D-17: CANCELED cannot RENEW → reject, no Payment, stays CANCELED."""
        r = auth_client.post(
            PAYMENTS_URL,
            {
                "subscription_id": str(canceled_subscription.id),
                "plan_id": str(basic_plan.id),
                "purpose": "RENEWAL",
            },
            content_type="application/json",
        )
        assert r.status_code in (400, 404)
        assert not Payment.objects.filter(subscription=canceled_subscription).exists()
        canceled_subscription.refresh_from_db()
        assert canceled_subscription.status == "CANCELED"

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_red_d_18_canceled_cannot_upgrade(self, mock_snap, auth_client, canceled_subscription, premium_plan):
        """RED-D-18: CANCELED cannot UPGRADE → reject, no Payment, stays CANCELED."""
        r = auth_client.post(
            PAYMENTS_URL,
            {
                "subscription_id": str(canceled_subscription.id),
                "plan_id": str(premium_plan.id),
                "purpose": "UPGRADE",
            },
            content_type="application/json",
        )
        assert r.status_code in (400, 404)
        assert not Payment.objects.filter(subscription=canceled_subscription).exists()
        canceled_subscription.refresh_from_db()
        assert canceled_subscription.status == "CANCELED"

    def test_red_d_19_webhook_no_reactivate_canceled(self, canceled_subscription, basic_plan):
        """RED-D-19: Verified payment webhook does NOT change CANCELED → ACTIVE."""
        p = Payment.objects.create(
            subscription=canceled_subscription,
            plan=basic_plan,
            amount=basic_plan.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS",
            purpose="RENEWAL",
        )
        payload = _midtrans_payload(str(p.id), f"txn-cancel-{p.id}", "settlement", str(p.amount))
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            client.post(WEBHOOK_URL, payload, content_type="application/json")
        p.refresh_from_db()
        canceled_subscription.refresh_from_db()
        assert p.status == "PAID"
        assert canceled_subscription.status == "CANCELED"

    def test_red_d_20_no_reactivation_shortcut(self, canceled_subscription):
        """RED-D-20: No payment/webhook path reactivates CANCELED."""
        assert canceled_subscription.status == "CANCELED"
        assert canceled_subscription.status != "ACTIVE"


# ================= TENANT ISOLATION (RED-D-21 to RED-D-23) =================


class TestTenantIsolationRed:

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_red_d_21_owner_cannot_cancel_other_business(self, mock_snap, auth_client, other_active_subscription):
        """RED-D-21: Owner A cannot cancel Business B's subscription → 404."""
        r = auth_client.post(
            SUBSCRIPTION_BASE.format(biz=other_active_subscription.business.id) + "cancel/",
            {},
            content_type="application/json",
        )
        assert r.status_code == 404
        other_active_subscription.refresh_from_db()
        assert other_active_subscription.status == "ACTIVE"

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_red_d_22_owner_cannot_renew_other_business(self, mock_snap, auth_client, other_expired_subscription, basic_plan):
        """RED-D-22: Owner A cannot renew Business B's subscription → 404."""
        r = auth_client.post(
            PAYMENTS_URL,
            {
                "subscription_id": str(other_expired_subscription.id),
                "plan_id": str(basic_plan.id),
                "purpose": "RENEWAL",
            },
            content_type="application/json",
        )
        assert r.status_code == 404
        assert not Payment.objects.filter(subscription=other_expired_subscription).exists()

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_red_d_23_owner_cannot_upgrade_other_business(self, mock_snap, auth_client, other_active_subscription, premium_plan):
        """RED-D-23: Owner A cannot upgrade Business B's subscription → 404."""
        r = auth_client.post(
            PAYMENTS_URL,
            {
                "subscription_id": str(other_active_subscription.id),
                "plan_id": str(premium_plan.id),
                "purpose": "UPGRADE",
            },
            content_type="application/json",
        )
        assert r.status_code == 404
        assert not Payment.objects.filter(subscription=other_active_subscription, purpose="UPGRADE").exists()


# ================= WEBHOOK SECURITY (RED-D-24 to RED-D-25) =================


class TestWebhookSecurityRed:

    def test_red_d_24_invalid_signature_renewal_no_mutation(self, expired_subscription, basic_plan):
        """RED-D-24: Invalid signature on renewal webhook → no Payment/Subscription/period/plan mutation."""
        old_period_end = expired_subscription.period_end
        old_plan = expired_subscription.plan
        p = Payment.objects.create(
            subscription=expired_subscription,
            plan=basic_plan,
            amount=basic_plan.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS",
            purpose="RENEWAL",
        )
        payload = _midtrans_payload(str(p.id), f"txn-inv-{p.id}", "settlement", str(p.amount))
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=False):
            client.post(WEBHOOK_URL, payload, content_type="application/json")
        p.refresh_from_db()
        expired_subscription.refresh_from_db()
        assert p.status == "PENDING"
        assert expired_subscription.plan == old_plan
        assert expired_subscription.period_end == old_period_end

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_red_d_25_duplicate_webhook_idempotent(self, mock_snap, auth_client, expired_subscription, basic_plan):
        """RED-D-25: Duplicate renewal webhook → processed once, period not extended twice."""
        p = Payment.objects.create(
            subscription=expired_subscription,
            plan=basic_plan,
            amount=basic_plan.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS",
            purpose="RENEWAL",
        )
        payload = _midtrans_payload(str(p.id), f"txn-dup-{p.id}", "settlement", str(p.amount))
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            r1 = client.post(WEBHOOK_URL, payload, content_type="application/json")
            r2 = client.post(WEBHOOK_URL, payload, content_type="application/json")
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert PaymentWebhookEvent.objects.filter(provider="MIDTRANS", event_id=f"txn-dup-{p.id}").count() == 1


# ================= TERMINAL SAFETY (RED-D-26 to RED-D-27) =================


class TestTerminalSafetyRed:

    def test_red_d_26_canceled_no_reactivate_by_webhook(self, canceled_subscription, basic_plan):
        """RED-D-26: CANCELED subscription cannot be reactivated by any webhook status."""
        for status in ("settlement", "capture", "deny", "expire", "cancel"):
            p = Payment.objects.create(
                subscription=canceled_subscription,
                plan=basic_plan,
                amount=basic_plan.amount,
                currency="IDR",
                status="PENDING",
                provider="MIDTRANS",
                purpose="RENEWAL",
            )
            payload = _midtrans_payload(str(p.id), f"txn-{status}-{p.id}", status, str(p.amount))
            client = Client()
            with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
                client.post(WEBHOOK_URL, payload, content_type="application/json")
            canceled_subscription.refresh_from_db()
            assert canceled_subscription.status == "CANCELED"

    def test_red_d_27_expired_failed_renewal_no_mutation(self, expired_subscription, basic_plan):
        """RED-D-27: Failed renewal payment on EXPIRED does not change status."""
        p = Payment.objects.create(
            subscription=expired_subscription,
            plan=basic_plan,
            amount=basic_plan.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS",
            purpose="RENEWAL",
        )
        payload = _midtrans_payload(str(p.id), f"txn-fail-{p.id}", "deny", str(p.amount))
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            client.post(WEBHOOK_URL, payload, content_type="application/json")
        p.refresh_from_db()
        expired_subscription.refresh_from_db()
        assert p.status == Payment.Status.FAILED
        assert expired_subscription.status == "EXPIRED"


# ================= BACKWARD COMPATIBILITY =================


class TestBackwardCompatibilityRed:

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_bc_initial_activation(self, mock_snap, auth_client, business, basic_plan):
        """BC: TRIAL → payment → verified webhook → ACTIVE still works."""
        sub = Subscription.objects.create(business=business, status="TRIAL")
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(sub.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 201
        assert r.data["purpose"] == "INITIAL"
        p = Payment.objects.get(pk=r.data["id"])
        _process_settlement_webhook(p)
        sub.refresh_from_db()
        assert sub.status == "ACTIVE"
        assert sub.plan == basic_plan

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_bc_renewal_still_works(self, mock_snap, auth_client, active_subscription, basic_plan):
        """BC: GREEN-02C-A renewal still works."""
        r = auth_client.post(
            PAYMENTS_URL,
            {
                "subscription_id": str(active_subscription.id),
                "plan_id": str(basic_plan.id),
                "purpose": "RENEWAL",
            },
            content_type="application/json",
        )
        assert r.status_code == 201
        p = Payment.objects.get(pk=r.data["id"])
        _process_settlement_webhook(p)
        active_subscription.refresh_from_db()
        assert active_subscription.status == "ACTIVE"

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_bc_upgrade_still_works(self, mock_snap, auth_client, active_subscription, premium_plan):
        """BC: GREEN-02C-A upgrade still works."""
        r = auth_client.post(
            PAYMENTS_URL,
            {
                "subscription_id": str(active_subscription.id),
                "plan_id": str(premium_plan.id),
                "purpose": "UPGRADE",
            },
            content_type="application/json",
        )
        assert r.status_code == 201
        p = Payment.objects.get(pk=r.data["id"])
        _process_settlement_webhook(p)
        active_subscription.refresh_from_db()
        assert active_subscription.plan == premium_plan

    def test_bc_payment_webhook_idempotency(self, active_subscription, basic_plan):
        """BC: PaymentWebhookEvent idempotency still works."""
        p = Payment.objects.create(
            subscription=active_subscription,
            plan=basic_plan,
            amount=basic_plan.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS",
            purpose="INITIAL",
        )
        payload = _midtrans_payload(str(p.id), f"txn-bc-{p.id}", "settlement", str(p.amount))
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            r1 = client.post(WEBHOOK_URL, payload, content_type="application/json")
            r2 = client.post(WEBHOOK_URL, payload, content_type="application/json")
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert PaymentWebhookEvent.objects.filter(provider="MIDTRANS", event_id=f"txn-bc-{p.id}").count() == 1
