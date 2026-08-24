"""PART 21 — Payment Integration CONTRACT v1 RED suite.

Locked contract scope (PART 21 CONTRACT v1):

  - Provider = Midtrans Snap (existing client reused).
  - PART 21 owns Payment, PaymentWebhookEvent, Midtrans client/webhook,
    payment status lifecycle, payment creation, signature verification,
    idempotency/concurrency.
  - Plan = PART 20 surface (referenced only).
  - Payment belongs to an existing PART 20 Subscription (FK reused).
  - POST /api/v1/billing/payments/ : subscription_id + plan_id.
    amount/currency/status/provider/provider_reference/paid_at are SERVER-CONTROLLED.
  - Auth: authenticated user who OWNS the Business of the Subscription.
  - Initial status PENDING.
  - Lifecycle: PENDING -> {PAID|FAILED|EXPIRED|CANCELED}; retry allowed after
    FAILED/EXPIRED/CANCELED; duplicate PENDING/PAID rejected.
  - Amount/Currency from the selected ACTIVE Plan; inactive Plan rejected.
  - Concurrency: no duplicate PENDING/PAID.
  - Midtrans Snap used; failure -> payment ends FAILED, never a fake success.
  - POST /api/v1/billing/webhooks/midtrans/ : provider->server, signature
    verified, invalid signature = no mutation, idempotent via (provider,event_id).
  - Successful webhook: Payment PAID + paid_at + provider_reference,
    Subscription -> ACTIVE (sanctioned cross-part mutation).
  - PAID cannot downgrade to FAILED/EXPIRED/CANCELED.
  - OUT OF SCOPE: refunds/invoices/recurring/dunning/coupons/proration/list/
    detail/multi-provider/scheduler/queue/notification/AI/analytics/audit/
    subscription suspend/cancel/any new model/FK/modification of PART 1-20.
"""

from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework_simplejwt.tokens import RefreshToken

from apps.billing.models import Payment, PaymentWebhookEvent, Plan
from apps.business.models import Business, Subscription

User = get_user_model()

PAYMENTS_URL = "/api/v1/billing/payments/"
WEBHOOK_URL = "/api/v1/billing/webhooks/midtrans/"
PLANS_URL = "/api/v1/billing/plans/"

MOCK_SNAP_RESPONSE = {
    "token": "snap-token-abc",
    "redirect_url": "https://app.sandbox.midtrans.com/snap/v2/redirect",
}


@pytest.fixture
def user(db):
    return User.objects.create_user(email="owner21@example.com", password="SecurePass123!")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(email="other21@example.com", password="SecurePass123!")


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
    return Business.objects.create(name="Toko Budi 21", owner=user)


@pytest.fixture
def other_business(db, other_user):
    return Business.objects.create(name="Toko Lain 21", owner=other_user)


@pytest.fixture
def basic_plan(db):
    return Plan.objects.get(code="basic")


@pytest.fixture
def inactive_plan(db):
    return Plan.objects.create(
        name="Inactive",
        code="inactive21",
        amount=Decimal("10000.00"),
        currency="IDR",
        billing_interval="MONTHLY",
        is_active=False,
    )


@pytest.fixture
def subscription(db, business):
    return Subscription.objects.create(business=business, status="ONBOARDING")


@pytest.fixture
def other_subscription(db, other_business):
    return Subscription.objects.create(business=other_business, status="ONBOARDING")


def _midtrans_payload(order_id, transaction_id, status, amount="99000.00", server_key="SB-Mid-server-test"):
    import hashlib

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


@pytest.mark.django_db
class TestPaymentCreateContract:
    # 1. authenticated + owner creation
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_owner_creates_payment(self, mock_snap, auth_client, subscription, basic_plan):
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 201
        assert r.data["status"] == "PENDING"
        assert Payment.objects.filter(subscription=subscription).count() == 1

    # 2. unauthenticated
    def test_unauthenticated_rejected(self, client, subscription, basic_plan):
        r = client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 401

    # 3. owner can create
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_owner_can_create(self, mock_snap, auth_client, subscription, basic_plan):
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 201

    # 4. non-owner -> 404 (no existence leakage)
    def test_non_owner_rejected_404(self, other_client, subscription, basic_plan):
        r = other_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 404
        assert Payment.objects.filter(subscription=subscription).count() == 0

    # 5. cross-business isolation
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_cross_business_isolation(self, mock_snap, other_client, subscription, basic_plan):
        r = other_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 404

    # 6. subscription ownership binding
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_payment_bound_to_subscription(self, mock_snap, auth_client, subscription, basic_plan):
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        p = Payment.objects.get(pk=r.data["id"])
        assert p.subscription_id == subscription.id

    # 7. active plan accepted
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_active_plan_accepted(self, mock_snap, auth_client, subscription, basic_plan):
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 201

    # 8. inactive plan rejected
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_inactive_plan_rejected(self, mock_snap, auth_client, subscription, inactive_plan):
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(inactive_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 400

    # 9. amount from plan
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_amount_from_plan(self, mock_snap, auth_client, subscription, basic_plan):
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        p = Payment.objects.get(pk=r.data["id"])
        assert p.amount == Decimal("99000.00")

    # 10. currency from plan
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_currency_from_plan(self, mock_snap, auth_client, subscription, basic_plan):
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        p = Payment.objects.get(pk=r.data["id"])
        assert p.currency == "IDR"

    # 11. protected fields cannot be overridden
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_cannot_override_amount(self, mock_snap, auth_client, subscription, basic_plan):
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id), "amount": "1"},
            content_type="application/json",
        )
        assert r.status_code == 400

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_cannot_override_currency(self, mock_snap, auth_client, subscription, basic_plan):
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id), "currency": "USD"},
            content_type="application/json",
        )
        assert r.status_code == 400

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_cannot_override_status(self, mock_snap, auth_client, subscription, basic_plan):
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id), "status": "PAID"},
            content_type="application/json",
        )
        assert r.status_code == 400

    # 12. initial status PENDING
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_initial_status_pending(self, mock_snap, auth_client, subscription, basic_plan):
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.data["status"] == "PENDING"

    # 13. duplicate PENDING rejected
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_duplicate_pending_rejected(self, mock_snap, auth_client, subscription, basic_plan):
        Payment.objects.create(
            subscription=subscription, plan=basic_plan, amount=basic_plan.amount,
            currency="IDR", status="PENDING", provider="MIDTRANS",
        )
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 400
        assert Payment.objects.filter(subscription=subscription).count() == 1

    # 14. duplicate PAID rejected
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_duplicate_paid_rejected(self, mock_snap, auth_client, subscription, basic_plan):
        Payment.objects.create(
            subscription=subscription, plan=basic_plan, amount=basic_plan.amount,
            currency="IDR", status="PAID", provider="MIDTRANS",
        )
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 400
        assert Payment.objects.filter(subscription=subscription).count() == 1

    # 15/16/17. retry allowed after terminal non-success
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_retry_after_failed(self, mock_snap, auth_client, subscription, basic_plan):
        Payment.objects.create(
            subscription=subscription, plan=basic_plan, amount=basic_plan.amount,
            currency="IDR", status="FAILED", provider="MIDTRANS",
        )
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 201

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_retry_after_expired(self, mock_snap, auth_client, subscription, basic_plan):
        Payment.objects.create(
            subscription=subscription, plan=basic_plan, amount=basic_plan.amount,
            currency="IDR", status="EXPIRED", provider="MIDTRANS",
        )
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 201

    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_retry_after_canceled(self, mock_snap, auth_client, subscription, basic_plan):
        Payment.objects.create(
            subscription=subscription, plan=basic_plan, amount=basic_plan.amount,
            currency="IDR", status="CANCELED", provider="MIDTRANS",
        )
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 201

    # 19. midtrans transaction creation invoked
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_midtrans_called(self, mock_snap, auth_client, subscription, basic_plan):
        auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        mock_snap.assert_called_once()

    # 20. midtrans failure -> FAILED, never a fake success
    @patch("apps.billing.views.create_snap_transaction", side_effect=RuntimeError("boom"))
    def test_midtrans_failure_ends_failed(self, mock_snap, auth_client, subscription, basic_plan):
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert r.status_code == 502
        p = Payment.objects.get(subscription=subscription)
        assert p.status == "FAILED"
        subscription.refresh_from_db()
        assert subscription.status == "ONBOARDING"

    # 35. response field contract
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_response_fields(self, mock_snap, auth_client, subscription, basic_plan):
        r = auth_client.post(
            PAYMENTS_URL,
            {"subscription_id": str(subscription.id), "plan_id": str(basic_plan.id)},
            content_type="application/json",
        )
        assert set(r.data.keys()) == {"id", "status", "provider_reference", "redirect_url", "token"}


@pytest.mark.django_db
class TestWebhookContract:
    def _paid_payment(self, subscription, basic_plan):
        return Payment.objects.create(
            subscription=subscription, plan=basic_plan, amount=basic_plan.amount,
            currency="IDR", status="PENDING", provider="MIDTRANS",
        )

    # 21. webhook signature validation
    def test_valid_signature_processes(self, subscription, basic_plan):
        p = self._paid_payment(subscription, basic_plan)
        payload = _midtrans_payload(str(p.id), f"txn-{p.id}", "settlement")
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            r = client.post(WEBHOOK_URL, payload, content_type="application/json")
        assert r.status_code == 200
        p.refresh_from_db()
        assert p.status == "PAID"

    # 22. invalid signature causes no mutation
    def test_invalid_signature_no_mutation(self, subscription, basic_plan):
        p = self._paid_payment(subscription, basic_plan)
        payload = _midtrans_payload(str(p.id), f"txn-inv-{p.id}", "settlement")
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=False):
            r = client.post(WEBHOOK_URL, payload, content_type="application/json")
        assert r.status_code == 200
        p.refresh_from_db()
        assert p.status == "PENDING"
        subscription.refresh_from_db()
        assert subscription.status == "ONBOARDING"
        assert PaymentWebhookEvent.objects.filter(event_id=f"txn-inv-{p.id}").exists()

    # 23/24/25/26. successful webhook outcomes
    def test_successful_webhook_activates_subscription(self, subscription, basic_plan):
        p = self._paid_payment(subscription, basic_plan)
        payload = _midtrans_payload(str(p.id), f"txn-ok-{p.id}", "settlement")
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            r = client.post(WEBHOOK_URL, payload, content_type="application/json")
        assert r.status_code == 200
        p.refresh_from_db()
        assert p.status == "PAID"
        assert p.paid_at is not None
        assert p.provider_reference == f"txn-ok-{p.id}"
        subscription.refresh_from_db()
        assert subscription.status == "ACTIVE"

    # 27/28. idempotency
    def test_duplicate_webhook_idempotent(self, subscription, basic_plan):
        p = self._paid_payment(subscription, basic_plan)
        payload = _midtrans_payload(str(p.id), f"txn-dup-{p.id}", "settlement")
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            r1 = client.post(WEBHOOK_URL, payload, content_type="application/json")
            r2 = client.post(WEBHOOK_URL, payload, content_type="application/json")
        assert r1.status_code == 200
        assert r2.status_code == 200
        p.refresh_from_db()
        assert p.status == "PAID"
        assert PaymentWebhookEvent.objects.filter(provider="MIDTRANS", event_id=f"txn-dup-{p.id}").count() == 1

    # 29. PAID cannot downgrade
    def test_paid_cannot_downgrade(self, subscription, basic_plan):
        p = self._paid_payment(subscription, basic_plan)
        p.status = "PAID"
        p.paid_at = p.created_at
        p.save()
        subscription.status = "ACTIVE"
        subscription.save()
        payload = _midtrans_payload(str(p.id), f"txn-down-{p.id}", "deny")
        client = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            r = client.post(WEBHOOK_URL, payload, content_type="application/json")
        assert r.status_code == 200
        p.refresh_from_db()
        subscription.refresh_from_db()
        assert p.status == "PAID"
        assert subscription.status == "ACTIVE"


@pytest.mark.django_db
class TestEndpointAbsenceContract:
    """30-34: OUT OF SCOPE endpoints must remain absent (404)."""

    def test_no_refund_endpoint(self, auth_client, subscription):
        r = auth_client.post(
            f"/api/v1/billing/payments/{subscription.id}/refund/", {}, content_type="application/json"
        )
        assert r.status_code == 404

    def test_no_invoice_endpoint(self, auth_client):
        r = auth_client.get("/api/v1/billing/invoices/")
        assert r.status_code == 404

    def test_no_payment_list_endpoint(self, auth_client):
        r = auth_client.get("/api/v1/billing/payments/")
        # No GET list handler is registered (only POST). 404 or 405 both prove
        # the out-of-scope "payment list endpoint" does not exist.
        assert r.status_code in (404, 405)

    def test_no_payment_detail_endpoint(self, auth_client, subscription):
        r = auth_client.get(f"/api/v1/billing/payments/{uuid4()}/")
        assert r.status_code == 404

    def test_no_subscription_suspend_endpoint(self, auth_client, subscription):
        r = auth_client.post(
            f"/api/v1/businesses/{subscription.business.id}/subscription/suspend/",
            {}, content_type="application/json",
        )
        assert r.status_code == 404

    def test_no_subscription_cancel_endpoint(self, auth_client, subscription):
        r = auth_client.post(
            f"/api/v1/businesses/{subscription.business.id}/subscription/cancel/",
            {}, content_type="application/json",
        )
        assert r.status_code == 404


@pytest.mark.django_db(transaction=True)
def test_concurrent_payment_creation_race(business, subscription):
    """18: two concurrent payments for the SAME subscription must not both be PENDING."""
    # Self-contained active Plan (avoids dependence on global seed DB state under
    # transaction=True test isolation).
    active_plan = Plan.objects.create(
        name="ConcurrencyPlan",
        code="concurrency21",
        amount=Decimal("99000.00"),
        currency="IDR",
        billing_interval="MONTHLY",
        is_active=True,
    )
    owner = business.owner
    token = str(RefreshToken.for_user(owner).access_token)
    url = PAYMENTS_URL
    payload = {"subscription_id": str(subscription.id), "plan_id": str(active_plan.id)}
    headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"}
    import threading

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
    assert pending == 1, f"Duplicate race: {pending} PENDING payments (expected 1)"
    assert sorted(codes.values()) == [201, 400], f"Expected one 201 and one 400, got {codes}"
