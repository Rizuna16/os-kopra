import decimal
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, Location, BusinessMembership
from apps.inventory.models import Stock
from apps.product.models import Product, Variant
from apps.sales.models import Sale, SaleLine
from apps.customer.models import Customer

User = get_user_model()


@pytest.fixture
def owner_user(db):
    return User.objects.create_user(
        email="owner_kasir@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def cashier_user(db):
    return User.objects.create_user(
        email="cashier_kasir@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def other_cashier_user(db):
    return User.objects.create_user(
        email="other_cashier@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def platform_admin_user(db):
    return User.objects.create_superuser(
        email="super_admin@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def business_a(db, owner_user):
    return Business.objects.create(name="Business A", owner=owner_user)


@pytest.fixture
def business_b(db, other_cashier_user):
    # Other cashier owns business B to simplify
    return Business.objects.create(name="Business B", owner=other_cashier_user)


@pytest.fixture
def location_a(db, business_a):
    return Location.objects.create(business=business_a, name="Location A")


@pytest.fixture
def location_b(db, business_b):
    return Location.objects.create(business=business_b, name="Location B")


@pytest.fixture
def membership_a(db, business_a, cashier_user):
    return BusinessMembership.objects.create(
        business=business_a, user=cashier_user, role="KASIR"
    )


@pytest.fixture
def membership_b(db, business_b, other_cashier_user):
    return BusinessMembership.objects.create(
        business=business_b, user=other_cashier_user, role="KASIR"
    )


@pytest.fixture
def product_a(db, business_a):
    return Product.objects.create(business=business_a, name="Product A", price="50000")


@pytest.fixture
def variant_a(db, product_a):
    return Variant.objects.create(product=product_a, name="Default")


@pytest.fixture
def stock_a(db, location_a, variant_a):
    return Stock.objects.create(location=location_a, variant=variant_a, quantity=100)


@pytest.fixture
def customer_a(db, business_a):
    return Customer.objects.create(business=business_a, name="Customer A")


def auth_client_for(user):
    from rest_framework.test import APIClient
    client = APIClient()
    token = RefreshToken.for_user(user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(token.access_token)}"
    return client


@pytest.mark.django_db
class TestCashierShiftRed:
    """RED tests verifying cashier shift lifecycle, modal, cash reconciliation, and isolation."""

    def test_cashier_can_open_shift(self, cashier_user, business_a, location_a, membership_a):
        client = auth_client_for(cashier_user)
        url = f"/api/v1/businesses/{business_a.id}/shifts/"
        payload = {
            "location": str(location_a.id),
            "modal_awal": "100000.00",
        }
        response = client.post(url, payload, format="json")
        # Assert failure because shifts endpoint does not exist yet (404/403 expected)
        assert response.status_code == status.HTTP_201_CREATED

    def test_one_active_shift_at_a_time_per_cashier_location(self, cashier_user, business_a, location_a, membership_a):
        client = auth_client_for(cashier_user)
        url = f"/api/v1/businesses/{business_a.id}/shifts/"
        # Open first shift
        client.post(url, {"location": str(location_a.id), "modal_awal": "100000.00"}, format="json")
        # Try to open second shift before closing first
        response = client.post(url, {"location": str(location_a.id), "modal_awal": "50000.00"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cross_tenant_shift_creation_blocked(self, cashier_user, business_b, location_b, membership_a):
        # Cashier A trying to open a shift in Business B / Location B
        client = auth_client_for(cashier_user)
        url = f"/api/v1/businesses/{business_b.id}/shifts/"
        payload = {
            "location": str(location_b.id),
            "modal_awal": "100000.00",
        }
        response = client.post(url, payload, format="json")
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]

    def test_cashier_can_close_shift_with_reconciliation(self, cashier_user, business_a, location_a, membership_a):
        client = auth_client_for(cashier_user)
        # Open shift first
        open_res = client.post(f"/api/v1/businesses/{business_a.id}/shifts/", {
            "location": str(location_a.id),
            "modal_awal": "100000.00"
        }, format="json")
        
        # In a real scenario shift_id would be obtained
        shift_id = open_res.data.get("id") if open_res.status_code == 201 else "00000000-0000-0000-0000-000000000000"
        
        url = f"/api/v1/businesses/{business_a.id}/shifts/{shift_id}/close/"
        payload = {
            "uang_tunai_aktual": "150000.00", # actual cash recorded by cashier
        }
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        # Expected outputs: status closed, total penjualan shift, expected cash, selisih kas
        assert response.data["status"] == "CLOSED"
        assert "selisih_kas" in response.data


@pytest.mark.django_db
class TestPOSSalesRed:
    """RED tests verifying cashier POS transaction creation, status gating, and shift linkage."""

    def test_pos_transaction_succeeds_with_payment_and_shift(
        self, cashier_user, business_a, location_a, membership_a, variant_a, stock_a, customer_a
    ):
        client = auth_client_for(cashier_user)
        # Open shift first
        client.post(
            f"/api/v1/businesses/{business_a.id}/shifts/",
            {"location": str(location_a.id), "modal_awal": "100000.00"},
            format="json"
        )
        # Verify cashier can make completed sales transactions under location with payment details
        url = f"/api/v1/businesses/{business_a.id}/sales/"
        payload = {
            "location": str(location_a.id),
            "customer": str(customer_a.id),
            "status": "COMPLETED",
            "payment_method": "QRIS",
            "lines": [
                {
                    "variant": str(variant_a.id),
                    "quantity": "2.00",
                    "unit_price": "50000.00"
                }
            ]
        }
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == "COMPLETED"
        assert response.data["payment_method"] == "QRIS"
        # Assert stock is reduced correctly
        stock_a.refresh_from_db()
        assert stock_a.quantity == 98


@pytest.mark.django_db
class TestHoldResumeRed:
    """RED tests verifying held transactions lifecycle."""

    def test_cashier_can_hold_and_resume_transaction(
        self, cashier_user, business_a, location_a, membership_a, variant_a
    ):
        client = auth_client_for(cashier_user)
        # Open shift first
        client.post(
            f"/api/v1/businesses/{business_a.id}/shifts/",
            {"location": str(location_a.id), "modal_awal": "100000.00"},
            format="json"
        )
        # Hold transaction: create sale with status HELD
        url = f"/api/v1/businesses/{business_a.id}/sales/"
        payload = {
            "location": str(location_a.id),
            "status": "HELD",
            "lines": [
                {
                    "variant": str(variant_a.id),
                    "quantity": "1.00",
                    "unit_price": "50000.00"
                }
            ]
        }
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == "HELD"
        sale_id = response.data["id"]

        # Resume transaction: fetch held sale detail
        detail_response = client.get(f"/api/v1/businesses/{business_a.id}/sales/{sale_id}/")
        assert detail_response.status_code == status.HTTP_200_OK
        assert detail_response.data["status"] == "HELD"

        # Complete held transaction
        complete_response = client.patch(
            f"/api/v1/businesses/{business_a.id}/sales/{sale_id}/",
            {"status": "COMPLETED", "payment_method": "CASH"},
            format="json"
        )
        assert complete_response.status_code == status.HTTP_200_OK
        assert complete_response.data["status"] == "COMPLETED"


@pytest.mark.django_db
class TestCashierAuthorizationRed:
    """RED tests verifying cashier roles permissions boundary."""

    def test_cashier_cannot_access_finance(self, cashier_user, business_a, membership_a):
        client = auth_client_for(cashier_user)
        url = f"/api/v1/businesses/{business_a.id}/journals/"
        response = client.get(url)
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]

    def test_cashier_cannot_modify_products(self, cashier_user, business_a, membership_a, product_a):
        client = auth_client_for(cashier_user)
        url = f"/api/v1/businesses/{business_a.id}/products/{product_a.id}/"
        response = client.patch(url, {"name": "Malicious Update"}, format="json")
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]

    def test_cashier_cannot_access_platform_admin(self, cashier_user):
        client = auth_client_for(cashier_user)
        url = "/api/v1/admin/businesses/"
        response = client.get(url)
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]
