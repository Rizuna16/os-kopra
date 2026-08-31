import hashlib
import pytest
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import Client
from apps.business.models import Business, Subscription
from apps.billing.models import Payment, Plan, PaymentWebhookEvent

User = get_user_model()


def _transaction_status_code(status):
    mapping = {"settlement": "200", "capture": "200", "expire": "400", "cancel": "400", "deny": "401"}
    return mapping.get(status, "200")


def _midtrans_payload(order_id, transaction_id, status, amount="99000.00", server_key="SB-Mid-server-test"):
    raw = f"{order_id}{_transaction_status_code(status)}{amount}{server_key}"
    sig = hashlib.sha512(raw.encode()).hexdigest()
    return {
        "order_id": str(order_id),
        "transaction_id": transaction_id,
        "transaction_status": status,
        "gross_amount": amount,
        "status_code": "200",
        "signature_key": sig,
    }


@pytest.mark.django_db
class TestSubscriptionLifecycleRedRework:

    @pytest.fixture
    def owner_a(self, db):
        return User.objects.create_user(email="owner_a@example.com", password="SecurePass123!")

    @pytest.fixture
    def owner_b(self, db):
        return User.objects.create_user(email="owner_b@example.com", password="SecurePass123!")

    @pytest.fixture
    def business_a(self, db, owner_a):
        return Business.objects.create(name="Business A", owner=owner_a)

    @pytest.fixture
    def business_b(self, db, owner_b):
        return Business.objects.create(name="Business B", owner=owner_b)

    @pytest.fixture
    def subscription_a(self, db, business_a):
        return Subscription.objects.create(business=business_a, status="ONBOARDING")

    @pytest.fixture
    def subscription_b(self, db, business_b):
        return Subscription.objects.create(business=business_b, status="ONBOARDING")

    @pytest.fixture
    def basic_plan(self, db):
        return Plan.objects.get(code="basic")

    # TRIAL test – genuine RED
    def test_trial_status_required_on_initial_subscription(self, business_a):
        sub = Subscription.objects.create(business=business_a)
        assert sub.status == Subscription.Status.TRIAL

    # PAYMENT scoping test – genuine GREEN
    def test_payment_links_to_correct_subscription_and_business(self, subscription_a, basic_plan):
        payment = Payment.objects.create(
            subscription=subscription_a,
            plan=basic_plan,
            amount=basic_plan.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS"
        )
        assert payment.subscription == subscription_a
        assert payment.subscription.business == subscription_a.business

    # CHECKOUT test – NOT PROVEN (no production boundary)
    # CHECKOUT PRODUCTION BOUNDARY = NOT IMPLEMENTED

    # VERIFICATION GATE tests using actual webhook flow

    def test_invalid_signature_webhook_does_not_activate(self, subscription_a, basic_plan):
        p = Payment.objects.create(
            subscription=subscription_a, plan=basic_plan,
            amount=basic_plan.amount, currency="IDR",
            status="PENDING", provider="MIDTRANS"
        )
        payload = _midtrans_payload(str(p.id), f"txn-{p.id}", "settlement")
        client_obj = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=False), \
             patch("apps.billing.views.create_snap_transaction", return_value={"token": "snap-abc", "redirect_url": "https://sandbox.midtrans.com"}):
            response = client_obj.post(
                "/api/v1/billing/webhooks/midtrans/", payload, content_type="application/json"
            )
        p.refresh_from_db()
        subscription_a.refresh_from_db()
        assert response.status_code == 200
        assert p.status == "PENDING"
        assert subscription_a.status != "ACTIVE"

    def test_non_settlement_webhook_does_not_activate(self, subscription_a, basic_plan):
        p = Payment.objects.create(
            subscription=subscription_a, plan=basic_plan,
            amount=basic_plan.amount, currency="IDR",
            status="PENDING", provider="MIDTRANS"
        )
        payload = _midtrans_payload(str(p.id), f"txn-{p.id}", "deny")
        client_obj = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            client_obj.post(
                "/api/v1/billing/webhooks/midtrans/", payload, content_type="application/json"
            )
        p.refresh_from_db()
        subscription_a.refresh_from_db()
        assert p.status == "FAILED"
        assert subscription_a.status != "ACTIVE"

    def test_valid_settlement_webhook_activates_subscription(self, subscription_a, basic_plan):
        p = Payment.objects.create(
            subscription=subscription_a, plan=basic_plan,
            amount=basic_plan.amount, currency="IDR",
            status="PENDING", provider="MIDTRANS"
        )
        payload = _midtrans_payload(str(p.id), f"txn-{p.id}", "settlement")
        client_obj = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            client_obj.post(
                "/api/v1/billing/webhooks/midtrans/", payload, content_type="application/json"
            )
        p.refresh_from_db()
        subscription_a.refresh_from_db()
        assert p.status == "PAID"
        assert subscription_a.status == "ACTIVE"

    def test_webhook_idempotency(self, subscription_a, basic_plan):
        p = Payment.objects.create(
            subscription=subscription_a, plan=basic_plan,
            amount=basic_plan.amount, currency="IDR",
            status="PENDING", provider="MIDTRANS"
        )
        payload = _midtrans_payload(str(p.id), f"txn-dup-{p.id}", "settlement")
        client_obj = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            r1 = client_obj.post("/api/v1/billing/webhooks/midtrans/", payload, content_type="application/json")
            r2 = client_obj.post("/api/v1/billing/webhooks/midtrans/", payload, content_type="application/json")
        p.refresh_from_db()
        subscription_a.refresh_from_db()
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert p.status == "PAID"
        assert subscription_a.status == "ACTIVE"
        assert PaymentWebhookEvent.objects.filter(provider="MIDTRANS", event_id=f"txn-dup-{p.id}").count() == 1

    # FAILED PAYMENT test – real behavior test via webhook
    def test_failed_payment_does_not_activate_subscription(self, subscription_a, basic_plan):
        p = Payment.objects.create(
            subscription=subscription_a, plan=basic_plan,
            amount=basic_plan.amount, currency="IDR",
            status="PENDING", provider="MIDTRANS"
        )
        payload = _midtrans_payload(str(p.id), f"txn-{p.id}", "deny")
        client_obj = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            client_obj.post(
                "/api/v1/billing/webhooks/midtrans/", payload, content_type="application/json"
            )
        p.refresh_from_db()
        subscription_a.refresh_from_db()
        assert p.status == "FAILED"
        assert subscription_a.status != "ACTIVE"

    # TENANT ISOLATION test – real behavior test via webhook
    def test_tenant_isolation_payment_does_not_cross_business(self, subscription_a, subscription_b, basic_plan):
        p_a = Payment.objects.create(
            subscription=subscription_a, plan=basic_plan,
            amount=basic_plan.amount, currency="IDR",
            status="PENDING", provider="MIDTRANS"
        )
        payload = _midtrans_payload(str(p_a.id), f"txn-a-{p_a.id}", "settlement")
        client_obj = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            client_obj.post("/api/v1/billing/webhooks/midtrans/", payload, content_type="application/json")
        subscription_b.refresh_from_db()
        subscription_a.refresh_from_db()
        assert subscription_a.status == "ACTIVE"
        assert subscription_b.status != "ACTIVE"

    # ACTIVE WITHOUT VERIFICATION is prevented by the webhook guard (invalid signature → not active)
    # Covered by test_invalid_signature_webhook_does_not_activate

    # RENEW/UPGRADE = NOT PROVEN
    # RENEW PRODUCTION BOUNDARY = NOT IMPLEMENTED
    # UPGRADE PRODUCTION BOUNDARY = NOT IMPLEMENTED
