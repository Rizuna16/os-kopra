import hashlib
from decimal import Decimal
from unittest.mock import patch
import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework_simplejwt.tokens import RefreshToken

from apps.billing.models import Payment, Plan
from apps.business.models import Business, BusinessMembership, Location, Subscription
from apps.product.models import Product, Variant

User = get_user_model()

PAYMENTS_URL = "/api/v1/billing/payments/"
PLANS_URL = "/api/v1/billing/plans/"
WEBHOOK_URL = "/api/v1/billing/webhooks/midtrans/"
MOCK_SNAP_RESPONSE = {
    "token": "snap-token-contract-test",
    "redirect_url": "https://app.sandbox.midtrans.com/snap/v2/redirect",
}


def _midtrans_payload(order_id, transaction_id, status, amount="99000.00", server_key="SB-Mid-server-test"):
    raw = f"{order_id}200{amount}{server_key}"
    sig = hashlib.sha512(raw.encode()).hexdigest()
    return {
        "order_id": str(order_id),
        "transaction_id": transaction_id,
        "transaction_status": status,
        "gross_amount": amount,
        "status_code": "200",
        "signature_key": sig,
    }


@pytest.fixture
def plan_basic(db):
    return Plan.objects.get(code="basic")


@pytest.fixture
def owner(db):
    return User.objects.create_user(email="owner_exp@example.com", password="SecurePass123!")


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(email="admin_exp@example.com", password="SecurePass123!")


@pytest.fixture
def kasir_user(db):
    return User.objects.create_user(email="kasir_exp@example.com", password="SecurePass123!")


@pytest.fixture
def superuser(db):
    return User.objects.create_superuser(email="super_exp@example.com", password="SecurePass123!")


@pytest.fixture
def expired_business(db, owner, admin_user, kasir_user, plan_basic):
    biz = Business.objects.create(name="Toko Expired", owner=owner)
    BusinessMembership.objects.create(business=biz, user=admin_user, role="ADMIN")
    BusinessMembership.objects.create(business=biz, user=kasir_user, role="KASIR")
    Subscription.objects.create(business=biz, status=Subscription.Status.EXPIRED, plan=plan_basic)
    return biz


@pytest.fixture
def active_business(db, owner, admin_user, kasir_user, plan_basic):
    biz = Business.objects.create(name="Toko Active", owner=owner)
    BusinessMembership.objects.create(business=biz, user=admin_user, role="ADMIN")
    BusinessMembership.objects.create(business=biz, user=kasir_user, role="KASIR")
    Subscription.objects.create(business=biz, status=Subscription.Status.ACTIVE, plan=plan_basic)
    return biz


@pytest.fixture
def expired_location(db, expired_business):
    return Location.objects.create(business=expired_business, name="Lokasi Expired")


@pytest.fixture
def active_location(db, active_business):
    return Location.objects.create(business=active_business, name="Lokasi Active")


@pytest.fixture
def expired_product_variant(db, expired_business):
    p = Product.objects.create(business=expired_business, name="Barang Exp", price="10000")
    v = Variant.objects.create(product=p, name="Default")
    return p, v


@pytest.fixture
def active_product_variant(db, active_business):
    p = Product.objects.create(business=active_business, name="Barang Act", price="10000")
    v = Variant.objects.create(product=p, name="Default")
    return p, v


def auth_client_for(client, user):
    client.logout()
    if "HTTP_AUTHORIZATION" in client.defaults:
        del client.defaults["HTTP_AUTHORIZATION"]
    refresh = RefreshToken.for_user(user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(refresh.access_token)}"
    return client


@pytest.mark.django_db
class TestSubscriptionExpiryGatingContractRed:
    """RED contract tests proving the Subscription Expiry Limited-Access Gating gap.

    Contract:
    When a subscription is EXPIRED or SUSPENDED, all state-changing operational
    endpoints (POST, PUT, PATCH, DELETE) across all domain modules are strictly denied
    with HTTP 403, excepting only billing, payment, renewal, subscription view, and
    authentication endpoints. Read-only views remain accessible.
    """

    # -------------------------------------------------------------------------
    # 1. EXPIRED OWNER: OPERATIONAL WRITES DENIED (RED)
    # -------------------------------------------------------------------------
    def test_expired_owner_cannot_create_product(self, client, owner, expired_business):
        """EXPIRED owner attempting product create -> HTTP 403."""
        c = auth_client_for(client, owner)
        resp = c.post(
            f"/api/v1/businesses/{expired_business.id}/products/",
            {"name": "Produk Baru", "price": "15.000"},
            content_type="application/json",
        )
        assert resp.status_code == 403, f"Expected 403 for expired business write, got {resp.status_code}"

    def test_expired_owner_cannot_create_sale(self, client, owner, expired_business, expired_location, expired_product_variant):
        """EXPIRED owner attempting sales create -> HTTP 403."""
        _, variant = expired_product_variant
        c = auth_client_for(client, owner)
        payload = {
            "location": str(expired_location.id),
            "status": "DRAFT",
            "lines": [{"variant": str(variant.id), "quantity": "1", "unit_price": "10000"}],
        }
        resp = c.post(
            f"/api/v1/businesses/{expired_business.id}/sales/",
            payload,
            content_type="application/json",
        )
        assert resp.status_code == 403, f"Expected 403 for expired business write, got {resp.status_code}"

    def test_expired_owner_cannot_create_inventory_stock(self, client, owner, expired_business, expired_location, expired_product_variant):
        """EXPIRED owner attempting inventory stock create -> HTTP 403."""
        _, variant = expired_product_variant
        c = auth_client_for(client, owner)
        payload = {
            "location": str(expired_location.id),
            "variant": str(variant.id),
            "quantity": 10,
        }
        resp = c.post(
            f"/api/v1/businesses/{expired_business.id}/locations/{expired_location.id}/stocks/",
            payload,
            content_type="application/json",
        )
        assert resp.status_code == 403, f"Expected 403 for expired business write, got {resp.status_code}"

    def test_expired_owner_cannot_create_customer(self, client, owner, expired_business):
        """EXPIRED owner attempting customer create -> HTTP 403."""
        c = auth_client_for(client, owner)
        payload = {"name": "Pelanggan Baru", "phone": "08123456789"}
        resp = c.post(
            f"/api/v1/businesses/{expired_business.id}/customers/",
            payload,
            content_type="application/json",
        )
        assert resp.status_code == 403, f"Expected 403 for expired business write, got {resp.status_code}"

    def test_expired_owner_cannot_create_supplier(self, client, owner, expired_business):
        """EXPIRED owner attempting supplier create -> HTTP 403."""
        c = auth_client_for(client, owner)
        payload = {"name": "Supplier Baru"}
        resp = c.post(
            f"/api/v1/businesses/{expired_business.id}/suppliers/",
            payload,
            content_type="application/json",
        )
        assert resp.status_code == 403, f"Expected 403 for expired business write, got {resp.status_code}"

    def test_expired_owner_cannot_create_finance_account(self, client, owner, expired_business):
        """EXPIRED owner attempting finance account create -> HTTP 403."""
        c = auth_client_for(client, owner)
        payload = {"code": "1001", "name": "Kas Utama", "type": "ASSET"}
        resp = c.post(
            f"/api/v1/businesses/{expired_business.id}/accounts/",
            payload,
            content_type="application/json",
        )
        assert resp.status_code == 403, f"Expected 403 for expired business write, got {resp.status_code}"

    def test_expired_owner_cannot_create_location(self, client, owner, expired_business):
        """EXPIRED owner attempting location create -> HTTP 403."""
        c = auth_client_for(client, owner)
        resp = c.post(
            f"/api/v1/businesses/{expired_business.id}/locations/",
            {"name": "Cabang Baru"},
            content_type="application/json",
        )
        assert resp.status_code == 403, f"Expected 403 for expired business write, got {resp.status_code}"

    # -------------------------------------------------------------------------
    # 2. EXPIRED ADMIN: OPERATIONAL WRITES DENIED (RED)
    # -------------------------------------------------------------------------
    def test_expired_admin_cannot_create_product(self, client, admin_user, expired_business):
        """EXPIRED admin attempting product create -> HTTP 403."""
        c = auth_client_for(client, admin_user)
        resp = c.post(
            f"/api/v1/businesses/{expired_business.id}/products/",
            {"name": "Produk Admin", "price": "20.000"},
            content_type="application/json",
        )
        assert resp.status_code == 403, f"Expected 403 for expired business write, got {resp.status_code}"

    # -------------------------------------------------------------------------
    # 3. EXPIRED KASIR: OPERATIONAL WRITES DENIED (RED)
    # -------------------------------------------------------------------------
    def test_expired_kasir_cannot_create_sale(self, client, kasir_user, expired_business, expired_location, expired_product_variant):
        """EXPIRED kasir attempting sale create -> HTTP 403."""
        _, variant = expired_product_variant
        c = auth_client_for(client, kasir_user)
        payload = {
            "location": str(expired_location.id),
            "status": "DRAFT",
            "lines": [{"variant": str(variant.id), "quantity": "1", "unit_price": "10000"}],
        }
        resp = c.post(
            f"/api/v1/businesses/{expired_business.id}/sales/",
            payload,
            content_type="application/json",
        )
        assert resp.status_code == 403, f"Expected 403 for expired business write, got {resp.status_code}"

    # -------------------------------------------------------------------------
    # 4. EXPIRED READ ACCESS: ALLOWED (GREEN)
    # -------------------------------------------------------------------------
    def test_expired_owner_can_read_business_and_products(self, client, owner, expired_business, expired_product_variant):
        """EXPIRED owner can still list products and view business details (Read-only allowed)."""
        c = auth_client_for(client, owner)
        resp_prod = c.get(f"/api/v1/businesses/{expired_business.id}/products/")
        assert resp_prod.status_code == 200

        resp_sales = c.get(f"/api/v1/businesses/{expired_business.id}/sales/")
        assert resp_sales.status_code == 200

    # -------------------------------------------------------------------------
    # 5. EXPIRED BILLING ACCESS: ALLOWED (GREEN)
    # -------------------------------------------------------------------------
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_expired_owner_can_view_plans_and_initiate_renewal(self, mock_snap, client, owner, expired_business, plan_basic):
        """EXPIRED owner can view plans and initiate payment/renewal."""
        c = auth_client_for(client, owner)
        resp_plans = c.get(PLANS_URL)
        assert resp_plans.status_code == 200

        sub = expired_business.subscriptions.first()
        resp_pay = c.post(
            PAYMENTS_URL,
            {
                "subscription_id": str(sub.id),
                "plan_id": str(plan_basic.id),
                "purpose": "RENEWAL",
            },
            content_type="application/json",
        )
        assert resp_pay.status_code == 201
        assert resp_pay.data["purpose"] == "RENEWAL"

    # -------------------------------------------------------------------------
    # 6. ACTIVE BUSINESS: ALLOWED (GREEN)
    # -------------------------------------------------------------------------
    def test_active_business_allows_operational_write(self, client, owner, active_business):
        """ACTIVE business allows operational writes normally."""
        c = auth_client_for(client, owner)
        resp = c.post(
            f"/api/v1/businesses/{active_business.id}/products/",
            {"name": "Produk Aktif", "price": "25.000"},
            content_type="application/json",
        )
        assert resp.status_code == 201

    # -------------------------------------------------------------------------
    # 7. MULTI-BUSINESS ISOLATION + SUBSCRIPTION (RED)
    # -------------------------------------------------------------------------
    def test_expired_business_a_cannot_use_active_business_b_subscription(
        self, client, owner, expired_business, active_business
    ):
        """Same owner: Business A (EXPIRED) is denied write; Business B (ACTIVE) is allowed write."""
        c = auth_client_for(client, owner)

        # Write to Business B (ACTIVE) -> 201
        resp_b = c.post(
            f"/api/v1/businesses/{active_business.id}/products/",
            {"name": "Produk Bisnis B", "price": "10.000"},
            content_type="application/json",
        )
        assert resp_b.status_code == 201

        # Write to Business A (EXPIRED) -> 403
        resp_a = c.post(
            f"/api/v1/businesses/{expired_business.id}/products/",
            {"name": "Produk Bisnis A", "price": "10.000"},
            content_type="application/json",
        )
        assert resp_a.status_code == 403, f"Expected 403 on expired business A, got {resp_a.status_code}"

    # -------------------------------------------------------------------------
    # 8. SUPER ADMIN PLATFORM BYPASS
    # -------------------------------------------------------------------------
    def test_superadmin_platform_bypass(self, client, superuser):
        """Super admin platform operations remain functional and separate."""
        c = auth_client_for(client, superuser)
        resp = c.get("/api/v1/admin/businesses/")
        assert resp.status_code == 200

    # -------------------------------------------------------------------------
    # 9. PAYMENT WEBHOOK RESTORATION (RED)
    # -------------------------------------------------------------------------
    @patch("apps.billing.views.create_snap_transaction", return_value=MOCK_SNAP_RESPONSE)
    def test_verified_payment_restores_operational_access(
        self, mock_snap, client, owner, expired_business, plan_basic
    ):
        """EXPIRED business -> paid webhook -> ACTIVE -> operational writes permitted."""
        c = auth_client_for(client, owner)

        # Before renewal: write must be blocked (RED)
        resp_before = c.post(
            f"/api/v1/businesses/{expired_business.id}/products/",
            {"name": "Produk Sebelum Renewal", "price": "10.000"},
            content_type="application/json",
        )
        assert resp_before.status_code == 403, f"Expected 403 before renewal, got {resp_before.status_code}"

        # Create renewal payment and simulate verified Midtrans settlement webhook
        sub = expired_business.subscriptions.first()
        payment = Payment.objects.create(
            subscription=sub,
            plan=plan_basic,
            amount=plan_basic.amount,
            currency="IDR",
            status="PENDING",
            provider="MIDTRANS",
            purpose="RENEWAL",
        )
        payload = _midtrans_payload(str(payment.id), f"txn-renew-{payment.id}", "settlement")
        client_raw = Client()
        with patch("apps.billing.views.verify_midtrans_signature", return_value=True):
            wh_resp = client_raw.post(WEBHOOK_URL, payload, content_type="application/json")
        assert wh_resp.status_code == 200

        sub.refresh_from_db()
        assert sub.status == Subscription.Status.ACTIVE

        # After renewal: write is allowed
        resp_after = c.post(
            f"/api/v1/businesses/{expired_business.id}/products/",
            {"name": "Produk Sesudah Renewal", "price": "10.000"},
            content_type="application/json",
        )
        assert resp_after.status_code == 201
