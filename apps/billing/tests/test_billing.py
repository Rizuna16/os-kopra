from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4
import threading

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework_simplejwt.tokens import RefreshToken

from apps.billing.models import Payment, PaymentWebhookEvent, Plan
from apps.business.models import Business, Subscription

User = get_user_model()

@pytest.fixture
def user(db):
    return User.objects.create_user(email="owner@example.com", password="SecurePass123!")

@pytest.fixture
def other_user(db):
    return User.objects.create_user(email="other@example.com", password="SecurePass123!")

@pytest.fixture
def auth_tokens(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)

@pytest.fixture
def other_tokens(other_user):
    refresh = RefreshToken.for_user(other_user)
    return str(refresh.access_token)

@pytest.fixture
def auth_client(client, auth_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {auth_tokens}"
    return client

@pytest.fixture
def other_client(client, other_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {other_tokens}"
    return client

@pytest.fixture
def business(db, user):
    return Business.objects.create(name="Toko Budi", owner=user)

@pytest.fixture
def other_business(db, other_user):
    return Business.objects.create(name="Toko Lain", owner=other_user)

@pytest.fixture
def basic_plan(db):
    return Plan.objects.get(code="basic")

@pytest.fixture
def inactive_plan(db):
    return Plan.objects.create(name="Inactive", code="inactive", amount=Decimal("10000.00"), currency="IDR", billing_interval="MONTHLY", is_active=False)

@pytest.fixture
def subscription(db, business):
    return Subscription.objects.create(business=business, status="ONBOARDING")

@pytest.fixture
def other_subscription(db, other_business):
    return Subscription.objects.create(business=other_business, status="ONBOARDING")


@pytest.mark.django_db
class TestPlan:
    def test_active_basic_plan_returned(self, client, auth_client, basic_plan):
        r = auth_client.get("/api/v1/billing/plans/")
        assert r.status_code == 200
        assert len(r.data) == 1
        assert r.data[0]["code"] == "basic"

    def test_inactive_plan_not_returned(self, client, auth_client, basic_plan, inactive_plan):
        r = auth_client.get("/api/v1/billing/plans/")
        assert r.status_code == 200
        assert len(r.data) == 1
        assert r.data[0]["code"] == "basic"

    def test_basic_amount(self, auth_client, basic_plan):
        r = auth_client.get("/api/v1/billing/plans/")
        assert Decimal(r.data[0]["amount"]) == Decimal("99000.00")

    def test_basic_currency(self, auth_client, basic_plan):
        r = auth_client.get("/api/v1/billing/plans/")
        assert r.data[0]["currency"] == "IDR"

    def test_basic_billing_interval(self, auth_client, basic_plan):
        r = auth_client.get("/api/v1/billing/plans/")
        assert r.data[0]["billing_interval"] == "MONTHLY"

    def test_unauthenticated_cannot_list_plans(self, client):
        r = client.get("/api/v1/billing/plans/")
        assert r.status_code == 401


MOCK_SNAP_RESPONSE = {"token": "snap-token-abc", "redirect_url": "https://app.sandbox.midtrans.com/snap/v2/redirect"}


@pytest.mark.django_db
class TestPaymentCreate:
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_authenticated_owner_creates_payment(self, mock_snap, auth_client, business, subscription, basic_plan):
        r = auth_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 201
        assert r.data["status"] == "PENDING"
        assert Payment.objects.filter(subscription=subscription).count() == 1

    def test_unauthenticated_rejected(self, client, subscription, basic_plan):
        r = client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 401

    def test_non_owner_cannot_create_payment(self, other_client, business, subscription, basic_plan):
        r = other_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 404

    def test_invalid_subscription_rejected(self, auth_client, business, basic_plan):
        r = auth_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(uuid4()), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 404

    def test_invalid_plan_rejected(self, auth_client, business, subscription):
        r = auth_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(uuid4())},
            content_type="application/json",
        )
        assert r.status_code == 400

    def test_inactive_plan_rejected(self, auth_client, business, subscription, inactive_plan):
        r = auth_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(inactive_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 400

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_amount_from_plan(self, mock_snap, auth_client, business, subscription, basic_plan):
        r = auth_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        p = Payment.objects.get(pk=r.data["id"])
        assert p.amount == Decimal("99000.00")

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_currency_from_plan(self, mock_snap, auth_client, business, subscription, basic_plan):
        r = auth_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        p = Payment.objects.get(pk=r.data["id"])
        assert p.currency == "IDR"

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_cannot_override_amount(self, mock_snap, auth_client, business, subscription, basic_plan):
        r = auth_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id), "amount": "1"},
            content_type="application/json",
        )
        assert r.status_code == 400

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_cannot_override_currency(self, mock_snap, auth_client, business, subscription, basic_plan):
        r = auth_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id), "currency": "USD"},
            content_type="application/json",
        )
        assert r.status_code == 400

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_payment_starts_pending(self, mock_snap, auth_client, business, subscription, basic_plan):
        r = auth_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.data["status"] == "PENDING"

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_business_owner_unchanged(self, mock_snap, auth_client, business, subscription, basic_plan):
        original_owner_id = business.owner_id
        auth_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        business.refresh_from_db()
        assert business.owner_id == original_owner_id

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_no_side_effects(self, mock_snap, auth_client, business, subscription, basic_plan):
        from apps.business.models import Location
        biz_ct, loc_ct, sub_ct, user_ct = Business.objects.count(), Location.objects.count(), Subscription.objects.count(), User.objects.count()
        auth_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert Business.objects.count() == biz_ct
        assert Location.objects.count() == loc_ct
        assert Subscription.objects.count() == sub_ct
        assert User.objects.count() == user_ct

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_cross_business_isolation(self, mock_snap, other_client, business, subscription, basic_plan):
        """other_client owns a different business; cannot pay for main business's subscription."""
        r = other_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 404

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_duplicate_pending_payment_rejected(self, mock_snap, auth_client, business, subscription, basic_plan):
        Payment.objects.create(
            subscription=subscription, plan=basic_plan, amount=basic_plan.amount,
            currency="IDR", status="PENDING", provider="MIDTRANS",
        )
        r = auth_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 400
        assert Payment.objects.filter(subscription=subscription).count() == 1

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_duplicate_paid_payment_rejected(self, mock_snap, auth_client, business, subscription, basic_plan):
        Payment.objects.create(
            subscription=subscription, plan=basic_plan, amount=basic_plan.amount,
            currency="IDR", status="PAID", provider="MIDTRANS",
        )
        r = auth_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 400
        assert Payment.objects.filter(subscription=subscription).count() == 1

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_retry_after_failed_allowed(self, mock_snap, auth_client, business, subscription, basic_plan):
        Payment.objects.create(
            subscription=subscription, plan=basic_plan, amount=basic_plan.amount,
            currency="IDR", status="FAILED", provider="MIDTRANS",
        )
        r = auth_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 201
        assert Payment.objects.filter(subscription=subscription).count() == 2

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_retry_after_expired_allowed(self, mock_snap, auth_client, business, subscription, basic_plan):
        Payment.objects.create(
            subscription=subscription, plan=basic_plan, amount=basic_plan.amount,
            currency="IDR", status="EXPIRED", provider="MIDTRANS",
        )
        r = auth_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 201
        assert Payment.objects.filter(subscription=subscription).count() == 2

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_retry_after_canceled_allowed(self, mock_snap, auth_client, business, subscription, basic_plan):
        Payment.objects.create(
            subscription=subscription, plan=basic_plan, amount=basic_plan.amount,
            currency="IDR", status="CANCELED", provider="MIDTRANS",
        )
        r = auth_client.post(
            "/api/v1/billing/payments/",
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 201
        assert Payment.objects.filter(subscription=subscription).count() == 2


def _midtrans_payload(order_id, transaction_id, status, amount="99000.00", server_key="SB-Mid-server-test"):
    import hashlib
    raw = f"{order_id}{transaction_status_code(status)}{amount}{server_key}"
    sig = hashlib.sha512(raw.encode()).hexdigest()
    return {
        "order_id": str(order_id),
        "transaction_id": transaction_id,
        "transaction_status": status,
        "gross_amount": amount,
        "status_code": "200",
        "signature_key": sig,
    }


def transaction_status_code(status):
    mapping = {"settlement": "200", "capture": "200", "expire": "400", "cancel": "400", "deny": "401"}
    return mapping.get(status, "200")


@pytest.mark.django_db
class TestWebhook:
    def test_successful_webhook_pays_subscription(self, business, subscription, basic_plan):
        # Create payment first
        with patch("apps.billing.views.create_snap_transaction", return_value={"token": "snap-abc", "redirect_url": "https://sandbox.midtrans.com"}):
            p = Payment.objects.create(subscription=subscription, plan=basic_plan, amount=basic_plan.amount, currency="IDR", status="PENDING", provider="MIDTRANS")

        payload = _midtrans_payload(str(p.id), f"txn-{p.id}", "settlement")

        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            # Client posts webhook
            client_obj = Client()
            response = client_obj.post(
                "/api/v1/billing/webhooks/midtrans/", payload, content_type="application/json"
            )

        assert response.status_code == 200

        p.refresh_from_db()
        assert p.status == "PAID"
        assert p.paid_at is not None
        assert p.provider_reference == f"txn-{p.id}"

        subscription.refresh_from_db()
        assert subscription.status == "ACTIVE"

    def test_duplicate_webhook_is_idempotent(self, business, subscription, basic_plan):
        with patch("apps.billing.views.create_snap_transaction", return_value={"token": "snap-abc", "redirect_url": "https://sandbox.midtrans.com"}):
            pass
        p = Payment.objects.create(subscription=subscription, plan=basic_plan, amount=basic_plan.amount, currency="IDR", status="PENDING", provider="MIDTRANS")
        payload = _midtrans_payload(str(p.id), f"txn-dup-{p.id}", "settlement")
        client_obj = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            r1 = client_obj.post("/api/v1/billing/webhooks/midtrans/", payload, content_type="application/json")
            r2 = client_obj.post("/api/v1/billing/webhooks/midtrans/", payload, content_type="application/json")
        assert r1.status_code == 200
        assert r2.status_code == 200
        p.refresh_from_db()
        assert p.status == "PAID"
        assert PaymentWebhookEvent.objects.filter(provider="MIDTRANS", event_id=f"txn-dup-{p.id}").count() == 1

    def test_failed_webhook_no_activate(self, business, subscription, basic_plan):
        p = Payment.objects.create(subscription=subscription, plan=basic_plan, amount=basic_plan.amount, currency="IDR", status="PENDING", provider="MIDTRANS")
        payload = _midtrans_payload(str(p.id), f"txn-fail-{p.id}", "failure")
        client_obj = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            r = client_obj.post("/api/v1/billing/webhooks/midtrans/", payload, content_type="application/json")
        assert r.status_code == 200
        p.refresh_from_db()
        assert p.status == "FAILED"
        subscription.refresh_from_db()
        assert subscription.status == "ONBOARDING"

    def test_invalid_signature_rejected(self, business, subscription, basic_plan):
        p = Payment.objects.create(subscription=subscription, plan=basic_plan, amount=basic_plan.amount, currency="IDR", status="PENDING", provider="MIDTRANS")
        payload = _midtrans_payload(str(p.id), f"txn-inv-{p.id}", "settlement")
        client_obj = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=False):
            r = client_obj.post("/api/v1/billing/webhooks/midtrans/", payload, content_type="application/json")
        assert r.status_code == 200
        p.refresh_from_db()
        assert p.status == "PENDING"
        subscription.refresh_from_db()
        assert subscription.status == "ONBOARDING"

    def _paid_payment_and_active_subscription(self, subscription, basic_plan):
        subscription.status = "ACTIVE"
        subscription.save()
        return Payment.objects.create(
            subscription=subscription,
            plan=basic_plan,
            amount=basic_plan.amount,
            currency="IDR",
            status="PAID",
            provider="MIDTRANS",
        )

    def test_paid_payment_rejects_failed_webhook(self, business, subscription, basic_plan):
        """PAID -> FAILED MUST BE REJECTED.

        Per agreed rule: PAID is terminal for normal payment status.
        A valid (signed) webhook with transaction_status=deny must NOT
        downgrade an already-PAID payment. EXPECTED RED until the webhook
        guard is implemented in apps/billing/views.py.
        """
        p = self._paid_payment_and_active_subscription(subscription, basic_plan)
        payload = _midtrans_payload(str(p.id), f"txn-paid-deny-{p.id}", "deny")
        client_obj = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            r = client_obj.post("/api/v1/billing/webhooks/midtrans/", payload, content_type="application/json")
        assert r.status_code == 200
        p.refresh_from_db()
        subscription.refresh_from_db()
        assert p.status == "PAID"
        assert subscription.status == "ACTIVE"

    def test_paid_payment_rejects_expired_webhook(self, business, subscription, basic_plan):
        """PAID -> EXPIRED MUST BE REJECTED.

        EXPECTED RED until the webhook guard is implemented.
        """
        p = self._paid_payment_and_active_subscription(subscription, basic_plan)
        payload = _midtrans_payload(str(p.id), f"txn-paid-expire-{p.id}", "expire")
        client_obj = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            r = client_obj.post("/api/v1/billing/webhooks/midtrans/", payload, content_type="application/json")
        assert r.status_code == 200
        p.refresh_from_db()
        subscription.refresh_from_db()
        assert p.status == "PAID"
        assert subscription.status == "ACTIVE"

    def test_paid_payment_rejects_canceled_webhook(self, business, subscription, basic_plan):
        """PAID -> CANCELED MUST BE REJECTED.

        EXPECTED RED until the webhook guard is implemented.
        """
        p = self._paid_payment_and_active_subscription(subscription, basic_plan)
        payload = _midtrans_payload(str(p.id), f"txn-paid-cancel-{p.id}", "cancel")
        client_obj = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            r = client_obj.post("/api/v1/billing/webhooks/midtrans/", payload, content_type="application/json")
        assert r.status_code == 200
        p.refresh_from_db()
        subscription.refresh_from_db()
        assert p.status == "PAID"
        assert subscription.status == "ACTIVE"

    def test_different_event_id_does_not_downgrade_paid_payment(self, business, subscription, basic_plan):
        """F-STATE-2: distinct transaction_id for the SAME payment must not
        downgrade an already-PAID payment.

        Webhook 1 (TX-1, settlement) and Webhook 2 (TX-2, deny, same order_id)
        both carry valid signatures. After the fix, the second event must NOT
        move Payment from PAID -> FAILED. EXPECTED RED until fixed.
        """
        p = self._paid_payment_and_active_subscription(subscription, basic_plan)
        client_obj = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            r1 = client_obj.post(
                "/api/v1/billing/webhooks/midtrans/",
                _midtrans_payload(str(p.id), "TX-1", "settlement"),
                content_type="application/json",
            )
            r2 = client_obj.post(
                "/api/v1/billing/webhooks/midtrans/",
                _midtrans_payload(str(p.id), "TX-2", "deny"),
                content_type="application/json",
            )
        assert r1.status_code == 200
        assert r2.status_code == 200
        p.refresh_from_db()
        subscription.refresh_from_db()
        assert p.status == "PAID"
        assert subscription.status == "ACTIVE"

    # NOTE (documentation only, no artificial test):
    # #6 PAID -> PENDING: MIDTRANS_STATUS_MAP has no value mapping to "PENDING",
    #    so no webhook can produce PENDING. No test added by design.
    # #8 Subscription SUSPENDED/CANCELED + webhook PAID: Subscription lifecycle
    #    change is out of scope for now (decision: don't change Subscription
    #    lifecycle). Actual behavior is that the webhook unconditionally sets
    #    subscription ACTIVE (F-STATE-3). No test asserting new behavior added.

    def test_no_server_key_exposed(self, auth_client):
        with patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE):
            r = auth_client.get("/api/v1/billing/plans/")
            assert "server_key" not in str(r.data)
            assert "SERVER_KEY" not in str(r.data)


@pytest.mark.django_db(transaction=True)
def test_concurrent_duplicate_payment_creation_race(business, subscription, basic_plan):
    """B-INT-1 concurrency: two concurrent POST /api/v1/billing/payments/ for the
    SAME Subscription must NOT yield two PENDING Payments.

    Production code (PaymentCreateView) now guards the check-then-create inside
    `transaction.atomic()` with `Subscription.objects.select_for_update()`. The row
    lock serializes concurrent requests for the same Subscription, so the second
    request observes the first Payment and is rejected with 400 (no second PENDING).

    This test fires two REAL concurrent requests (separate threads + Client()
    instances, independent DB connections) at the real endpoint. No threading.Barrier
    and no patch on Payment.objects.create are used -- we rely on the production
    row-lock to serialize the requests deterministically. create_snap_transaction is
    mocked so no network call is made.
    """
    from rest_framework_simplejwt.tokens import RefreshToken

    owner = business.owner
    token = str(RefreshToken.for_user(owner).access_token)
    url = "/api/v1/billing/payments/"
    payload = {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)}
    headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    codes = {}

    def worker(key):
        client = Client()
        with patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE):
            r = client.post(url, data=payload, content_type="application/json", **headers)
        codes[key] = r.status_code

    threads = [threading.Thread(target=worker, args=(k,)) for k in ("a", "b")]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    pending = Payment.objects.filter(subscription=subscription, status="PENDING").count()
    assert pending == 1, f"Duplicate race: {pending} PENDING payments created (expected exactly 1)"
    assert sorted(codes.values()) == [201, 400], f"Expected one 201 and one 400, got {codes}"
