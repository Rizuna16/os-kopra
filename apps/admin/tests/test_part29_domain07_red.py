import pytest
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.models import User
from apps.business.models import Business, Subscription
from apps.billing.models import Plan, Payment
from apps.audit.models import AuditLog


@pytest.fixture
def superadmin():
    return User.objects.create_superuser(
        email="superadmin07@kopera.io",
        password="password123",
        first_name="Super",
        last_name="Admin",
    )


@pytest.fixture
def normal_user():
    return User.objects.create_user(
        email="user07@kopera.io",
        password="password123",
        first_name="Normal",
        last_name="User",
    )


@pytest.fixture
def staff_user():
    return User.objects.create_user(
        email="staff07@kopera.io",
        password="password123",
        is_staff=True,
        is_superuser=False,
    )


@pytest.fixture
def sample_payment(superadmin):
    plan = Plan.objects.create(
        name="Enterprise Plan",
        code="ENT-07",
        amount=500000.00,
        currency="IDR",
        billing_interval="MONTHLY",
    )
    business = Business.objects.create(
        name="Toko Makmur 07",
        owner=superadmin,
        status="ACTIVE",
    )
    subscription = Subscription.objects.create(
        business=business,
        status="ACTIVE",
    )
    payment = Payment.objects.create(
        subscription=subscription,
        plan=plan,
        amount=plan.amount,
        currency=plan.currency,
        status=Payment.Status.PAID,
        provider="MIDTRANS",
        provider_reference="snap-token-07",
    )
    return payment


@pytest.mark.django_db
class TestDomain07Red:
    def test_d07_01_super_admin_payment_list(self, superadmin, sample_payment):
        client = APIClient()
        client.force_authenticate(user=superadmin)
        url = "/api/v1/admin/payments/"
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1
        item = data[0]
        assert "id" in item
        assert "subscription_id" in item
        assert "amount" in item
        assert "status" in item
        assert AuditLog.objects.filter(actor=superadmin, action="PAYMENT_LIST_VIEWED").exists()

    def test_d07_02_super_admin_payment_detail(self, superadmin, sample_payment):
        client = APIClient()
        client.force_authenticate(user=superadmin)
        url = f"/api/v1/admin/payments/{sample_payment.id}/"
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(sample_payment.id)
        assert "subscription" in data or "subscription_id" in data
        assert "plan" in data
        assert AuditLog.objects.filter(actor=superadmin, action="PAYMENT_DETAIL_VIEWED").exists()

    def test_d07_03_billing_summary(self, superadmin, sample_payment):
        client = APIClient()
        client.force_authenticate(user=superadmin)
        url = "/api/v1/admin/billing/summary/"
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total_payments" in data
        assert "total_paid_payments" in data
        assert "valid_paid_revenue" in data
        assert AuditLog.objects.filter(actor=superadmin, action="BILLING_SUMMARY_VIEWED").exists()

    def test_d07_04_anonymous_payment_list(self):
        client = APIClient()
        url = "/api/v1/admin/payments/"
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_d07_05_owner_payment_list(self, normal_user):
        client = APIClient()
        client.force_authenticate(user=normal_user)
        url = "/api/v1/admin/payments/"
        response = client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_d07_09_staff_only_payment_list(self, staff_user):
        client = APIClient()
        client.force_authenticate(user=staff_user)
        url = "/api/v1/admin/payments/"
        response = client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_d07_15_payment_status_mutation_blocked(self, superadmin, sample_payment):
        client = APIClient()
        client.force_authenticate(user=superadmin)
        url = f"/api/v1/admin/payments/{sample_payment.id}/"
        response = client.patch(url, {"status": "PENDING"})
        assert response.status_code in [status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST]

    def test_d07_19_payment_secret_sanitization(self, superadmin, sample_payment):
        client = APIClient()
        client.force_authenticate(user=superadmin)
        url = f"/api/v1/admin/payments/{sample_payment.id}/"
        response = client.get(url)
        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            data_str = str(data).lower()
            assert "password" not in data_str
            assert "secret" not in data_str
            assert "server_key" not in data_str
