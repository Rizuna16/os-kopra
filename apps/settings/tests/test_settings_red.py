"""
KOPERA — NODE 18 SETTINGS / PENGATURAN
GREEN TESTS — Contract Lock Validation

These tests verify that Node 18 Settings implementation is PRESENT and CORRECT.
They must PASS (GREEN) with the implemented feature.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.business.models import Business, BusinessMembership, Subscription

User = get_user_model()


@pytest.fixture
def owner(db):
    return User.objects.create_user(
        email="settings_owner@example.com",
        password="password123",
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email="settings_admin@example.com",
        password="password123",
    )


@pytest.fixture
def kasir_user(db):
    return User.objects.create_user(
        email="settings_kasir@example.com",
        password="password123",
    )


@pytest.fixture
def other_owner(db):
    return User.objects.create_user(
        email="settings_other_owner@example.com",
        password="password123",
    )


@pytest.fixture
def business(db, owner):
    return Business.objects.create(
        name="Toko Settings",
        owner=owner,
        business_type="Fashion",
    )


@pytest.fixture
def other_business(db, other_owner):
    return Business.objects.create(
        name="Other Biz",
        owner=other_owner,
        business_type="Fashion",
    )


@pytest.fixture
def owner_client(db, owner):
    client = APIClient()
    client.force_authenticate(user=owner)
    return client


@pytest.fixture
def admin_client(db, admin_user, business):
    BusinessMembership.objects.create(
        business=business,
        user=admin_user,
        role=BusinessMembership.Role.ADMIN,
    )
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def kasir_client(db, kasir_user, business):
    BusinessMembership.objects.create(
        business=business,
        user=kasir_user,
        role=BusinessMembership.Role.KASIR,
    )
    client = APIClient()
    client.force_authenticate(user=kasir_user)
    return client


@pytest.fixture
def other_owner_client(db, other_owner):
    client = APIClient()
    client.force_authenticate(user=other_owner)
    return client


# ============================================================
# A. SETTINGS MODULE EXISTENCE
# ============================================================

@pytest.mark.django_db
class TestSettingsModuleExistence:
    """Verify that the Settings module exists and is functional."""

    def test_settings_has_production_models(self):
        """apps/settings/ must have models."""
        from importlib.util import find_spec
        spec = find_spec("apps.settings")
        assert spec is not None, "apps/settings package not found"
        from apps.settings import models
        assert hasattr(models, "BusinessTaxConfig")
        assert hasattr(models, "BusinessCurrencyConfig")
        assert hasattr(models, "BusinessInvoiceConfig")
        assert hasattr(models, "BusinessReceiptConfig")
        assert hasattr(models, "UserNotificationPreference")
        assert hasattr(models, "BusinessIntegrationConfig")

    def test_settings_endpoint_registered(self, owner_client, business):
        """GET /settings/tax/ must return 200 (endpoint exists)."""
        resp = owner_client.get(
            f"/api/v1/businesses/{business.id}/settings/tax/"
        )
        assert resp.status_code == status.HTTP_200_OK


# ============================================================
# B. BUSINESS SETTINGS — Brand Fields
# ============================================================

@pytest.mark.django_db
class TestBusinessSettingsBrandFields:
    """Verify Business model has brand fields."""

    def test_business_model_has_logo_url(self, business):
        """Business model must have logo_url field."""
        assert hasattr(business, "logo_url")

    def test_business_model_has_brand_color(self, business):
        """Business model must have brand_color field."""
        assert hasattr(business, "brand_color")

    def test_business_model_has_tagline(self, business):
        """Business model must have tagline field."""
        assert hasattr(business, "tagline")


# ============================================================
# C. TAX CONFIGURATION
# ============================================================

@pytest.mark.django_db
class TestTaxConfigGreen:
    """Verify Tax configuration endpoint works correctly."""

    def test_get_tax_200_with_defaults(self, owner_client, business):
        """GET returns 200 with auto-provisioned defaults."""
        resp = owner_client.get(
            f"/api/v1/businesses/{business.id}/settings/tax/"
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["tax_rate"] == "0.00"
        assert data["tax_name"] == "PPN"
        assert data["tax_inclusive"] is False

    def test_patch_tax_200(self, owner_client, business):
        """PATCH updates tax settings."""
        resp = owner_client.patch(
            f"/api/v1/businesses/{business.id}/settings/tax/",
            {"tax_rate": "11", "tax_name": "VAT", "tax_inclusive": True},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["tax_rate"] == "11.00"
        assert data["tax_name"] == "VAT"
        assert data["tax_inclusive"] is True

    def test_tax_validation_rate_range(self, owner_client, business):
        """Tax rate must be 0-100."""
        resp = owner_client.patch(
            f"/api/v1/businesses/{business.id}/settings/tax/",
            {"tax_rate": "101"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_tax_validation_name_non_empty(self, owner_client, business):
        """Tax name must not be empty."""
        resp = owner_client.patch(
            f"/api/v1/businesses/{business.id}/settings/tax/",
            {"tax_name": ""},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ============================================================
# D. CURRENCY CONFIGURATION
# ============================================================

@pytest.mark.django_db
class TestCurrencyConfigGreen:
    """Verify Currency configuration endpoint works correctly."""

    def test_get_currency_200_with_defaults(self, owner_client, business):
        resp = owner_client.get(
            f"/api/v1/businesses/{business.id}/settings/currency/"
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["currency_code"] == "IDR"
        assert data["currency_symbol"] == "Rp"
        assert data["decimal_places"] == 0

    def test_patch_currency_200(self, owner_client, business):
        resp = owner_client.patch(
            f"/api/v1/businesses/{business.id}/settings/currency/",
            {"currency_code": "USD", "currency_symbol": "$", "decimal_places": 2},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["currency_code"] == "USD"
        assert data["currency_symbol"] == "$"
        assert data["decimal_places"] == 2

    def test_currency_validation_code_iso(self, owner_client, business):
        resp = owner_client.patch(
            f"/api/v1/businesses/{business.id}/settings/currency/",
            {"currency_code": "US"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_currency_validation_decimal_places(self, owner_client, business):
        resp = owner_client.patch(
            f"/api/v1/businesses/{business.id}/settings/currency/",
            {"decimal_places": 5},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ============================================================
# E. INVOICE CONFIGURATION
# ============================================================

@pytest.mark.django_db
class TestInvoiceConfigGreen:
    """Verify Invoice configuration endpoint works correctly."""

    def test_get_invoice_200_with_defaults(self, owner_client, business):
        resp = owner_client.get(
            f"/api/v1/businesses/{business.id}/settings/invoice/"
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["invoice_prefix"] == "INV-"
        assert data["invoice_next_number"] == 1
        assert data["invoice_notes"] == ""
        assert data["invoice_footer"] == ""

    def test_patch_invoice_200(self, owner_client, business):
        resp = owner_client.patch(
            f"/api/v1/businesses/{business.id}/settings/invoice/",
            {"invoice_prefix": "FTR-", "invoice_next_number": 42, "invoice_notes": "Notes", "invoice_footer": "Footer"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["invoice_prefix"] == "FTR-"
        assert data["invoice_next_number"] == 42
        assert data["invoice_notes"] == "Notes"
        assert data["invoice_footer"] == "Footer"

    def test_invoice_validation_prefix(self, owner_client, business):
        resp = owner_client.patch(
            f"/api/v1/businesses/{business.id}/settings/invoice/",
            {"invoice_prefix": ""},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_invoice_validation_next_number(self, owner_client, business):
        resp = owner_client.patch(
            f"/api/v1/businesses/{business.id}/settings/invoice/",
            {"invoice_next_number": 0},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ============================================================
# F. RECEIPT CONFIGURATION
# ============================================================

@pytest.mark.django_db
class TestReceiptConfigGreen:
    """Verify Receipt configuration endpoint works correctly."""

    def test_get_receipt_200_with_defaults(self, owner_client, business):
        resp = owner_client.get(
            f"/api/v1/businesses/{business.id}/settings/receipt/"
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["receipt_prefix"] == "RCT-"
        assert data["receipt_next_number"] == 1
        assert data["receipt_notes"] == ""
        assert data["receipt_footer"] == ""

    def test_patch_receipt_200(self, owner_client, business):
        resp = owner_client.patch(
            f"/api/v1/businesses/{business.id}/settings/receipt/",
            {"receipt_prefix": "RCP-", "receipt_next_number": 100, "receipt_notes": "Receipt notes", "receipt_footer": "Footer"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["receipt_prefix"] == "RCP-"
        assert data["receipt_next_number"] == 100
        assert data["receipt_notes"] == "Receipt notes"
        assert data["receipt_footer"] == "Footer"

    def test_receipt_validation_prefix(self, owner_client, business):
        resp = owner_client.patch(
            f"/api/v1/businesses/{business.id}/settings/receipt/",
            {"receipt_prefix": ""},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_receipt_validation_next_number(self, owner_client, business):
        resp = owner_client.patch(
            f"/api/v1/businesses/{business.id}/settings/receipt/",
            {"receipt_next_number": 0},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ============================================================
# G. NOTIFICATION PREFERENCES
# ============================================================

@pytest.mark.django_db
class TestNotificationPrefsGreen:
    """Verify Notification Preferences endpoint works correctly."""

    def test_get_notifications_200_with_defaults(self, owner_client, business):
        resp = owner_client.get(
            f"/api/v1/businesses/{business.id}/settings/notifications/"
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["receive_stock_alerts"] is True
        assert data["receive_order_alerts"] is True
        assert data["receive_payment_alerts"] is True
        assert data["receive_subscription_alerts"] is True

    def test_patch_notifications_200(self, owner_client, business):
        resp = owner_client.patch(
            f"/api/v1/businesses/{business.id}/settings/notifications/",
            {"receive_stock_alerts": False, "receive_order_alerts": False},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["receive_stock_alerts"] is False
        assert data["receive_order_alerts"] is False


# ============================================================
# H. INTEGRATION CONFIGURATION
# ============================================================

@pytest.mark.django_db
class TestIntegrationConfigGreen:
    """Verify Integration configuration endpoint works correctly."""

    def test_get_integration_200_with_defaults(self, owner_client, business):
        resp = owner_client.get(
            f"/api/v1/businesses/{business.id}/settings/integration/"
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert "storefront_url" in data
        assert "webhook_url" in data
        assert "api_docs_url" in data
        assert data["api_docs_url"] == "/api/v1/docs/"

    def test_patch_integration_200(self, owner_client, business):
        resp = owner_client.patch(
            f"/api/v1/businesses/{business.id}/settings/integration/",
            {"webhook_url": "https://example.com/hook"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["webhook_url"] == "https://example.com/hook"


# ============================================================
# I. BUSINESS SETTINGS ENDPOINT
# ============================================================

@pytest.mark.django_db
class TestBusinessSettingsEndpointGreen:
    """Verify Business Settings endpoint works correctly."""

    def test_get_business_settings_200(self, owner_client, business):
        resp = owner_client.get(
            f"/api/v1/businesses/{business.id}/settings/business/"
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["id"] == str(business.id)
        assert data["name"] == "Toko Settings"
        assert data["business_type"] == "Fashion"
        assert "logo_url" in data
        assert "brand_color" in data
        assert "tagline" in data
        assert "status" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_patch_business_settings_200(self, owner_client, business):
        resp = owner_client.patch(
            f"/api/v1/businesses/{business.id}/settings/business/",
            {"name": "Updated Name", "brand_color": "#FF0000", "tagline": "New Tagline"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["name"] == "Updated Name"
        assert data["brand_color"] == "#FF0000"
        assert data["tagline"] == "New Tagline"
        # Read-only fields should not change
        assert data["business_type"] == "Fashion"
        assert data["id"] == str(business.id)


# ============================================================
# J. SECURITY — INV-SET-2 Cross-business
# ============================================================

@pytest.mark.django_db
class TestSettingsCrossBusinessGreen:
    """Verify cross-business access returns 404."""

    def test_cross_business_settings_404(self, other_owner_client, business, other_owner):
        """Non-member accessing another business's settings returns 404."""
        resp = other_owner_client.get(
            f"/api/v1/businesses/{business.id}/settings/tax/"
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND


# ============================================================
# K. SECURITY — INV-SET-3 Role-based access
# ============================================================

@pytest.mark.django_db
class TestSettingsRoleAccessGreen:
    """Verify role-based access control."""

    def test_kasir_get_settings_200(self, kasir_client, business):
        """Kasir GET must return 200."""
        resp = kasir_client.get(
            f"/api/v1/businesses/{business.id}/settings/tax/"
        )
        assert resp.status_code == status.HTTP_200_OK

    def test_kasir_patch_settings_403(self, kasir_client, business):
        """Kasir PATCH must return 403 (denied)."""
        resp = kasir_client.patch(
            f"/api/v1/businesses/{business.id}/settings/tax/",
            {"tax_rate": 5},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_patch_settings_200(self, admin_client, business):
        """Admin PATCH must return 200 (allowed)."""
        resp = admin_client.patch(
            f"/api/v1/businesses/{business.id}/settings/tax/",
            {"tax_rate": 7},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK


# ============================================================
# L. SECURITY — INV-SET-8 Mass assignment
# ============================================================

@pytest.mark.django_db
class TestSettingsMassAssignmentGreen:
    """Verify business field is not writable from client payload."""

    def test_mass_assignment_business_ignored(self, owner_client, business, owner):
        """Business ID in payload must be ignored; config stays on URL business."""
        other = Business.objects.create(
            name="Other Biz", owner=owner, business_type="Fashion"
        )
        resp = owner_client.patch(
            f"/api/v1/businesses/{business.id}/settings/tax/",
            {"business": str(other.id), "tax_rate": 11},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        # Response should be for the business in the URL, not the payload
        assert data["business"] == str(business.id)
        assert data["tax_rate"] == "11.00"


# ============================================================
# M. SECURITY — INV-SET-6 No secrets
# ============================================================

@pytest.mark.django_db
class TestSettingsNoSecretsGreen:
    """Verify no secrets/credentials in response."""

    def test_integration_no_secrets(self, owner_client, business):
        resp = owner_client.get(
            f"/api/v1/businesses/{business.id}/settings/integration/"
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        allowed_keys = {"id", "business", "storefront_url", "webhook_url", "api_docs_url", "created_at", "updated_at"}
        assert set(data.keys()) == allowed_keys
        assert "api_key" not in data
        assert "secret" not in data
        assert "webhook_secret" not in data
        assert "payment_secret" not in data


# ============================================================
# N. SECURITY — INV-SET-7 No ownership takeover
# ============================================================

@pytest.mark.django_db
class TestSettingsNoOwnershipTakeoverGreen:
    """Verify Settings does not duplicate other module operations."""

    def test_settings_does_not_create_user(self, owner_client, business):
        before = User.objects.count()
        resp = owner_client.get(
            f"/api/v1/businesses/{business.id}/settings/business/"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert User.objects.count() == before

    def test_settings_does_not_create_business(self, owner_client, business):
        before = Business.objects.count()
        resp = owner_client.get(
            f"/api/v1/businesses/{business.id}/settings/tax/"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert Business.objects.count() == before


# ============================================================
# O. INV-SET-5 Auto-provisioning
# ============================================================

@pytest.mark.django_db
class TestSettingsAutoProvisioningGreen:
    """Verify first GET auto-provisions defaults."""

    def test_tax_auto_provisions(self, owner_client, business):
        from apps.settings.models import BusinessTaxConfig
        assert not BusinessTaxConfig.objects.filter(business=business).exists()
        resp = owner_client.get(f"/api/v1/businesses/{business.id}/settings/tax/")
        assert resp.status_code == status.HTTP_200_OK
        assert BusinessTaxConfig.objects.filter(business=business).count() == 1

    def test_currency_auto_provisions(self, owner_client, business):
        from apps.settings.models import BusinessCurrencyConfig
        assert not BusinessCurrencyConfig.objects.filter(business=business).exists()
        resp = owner_client.get(f"/api/v1/businesses/{business.id}/settings/currency/")
        assert resp.status_code == status.HTTP_200_OK
        assert BusinessCurrencyConfig.objects.filter(business=business).count() == 1

    def test_invoice_auto_provisions(self, owner_client, business):
        from apps.settings.models import BusinessInvoiceConfig
        assert not BusinessInvoiceConfig.objects.filter(business=business).exists()
        resp = owner_client.get(f"/api/v1/businesses/{business.id}/settings/invoice/")
        assert resp.status_code == status.HTTP_200_OK
        assert BusinessInvoiceConfig.objects.filter(business=business).count() == 1

    def test_receipt_auto_provisions(self, owner_client, business):
        from apps.settings.models import BusinessReceiptConfig
        assert not BusinessReceiptConfig.objects.filter(business=business).exists()
        resp = owner_client.get(f"/api/v1/businesses/{business.id}/settings/receipt/")
        assert resp.status_code == status.HTTP_200_OK
        assert BusinessReceiptConfig.objects.filter(business=business).count() == 1

    def test_notifications_auto_provisions(self, owner_client, business):
        from apps.settings.models import UserNotificationPreference
        assert not UserNotificationPreference.objects.filter(business=business, user=owner_client.handler._force_user).exists()
        resp = owner_client.get(f"/api/v1/businesses/{business.id}/settings/notifications/")
        assert resp.status_code == status.HTTP_200_OK
        assert UserNotificationPreference.objects.filter(business=business).count() == 1

    def test_integration_auto_provisions(self, owner_client, business):
        from apps.settings.models import BusinessIntegrationConfig
        assert not BusinessIntegrationConfig.objects.filter(business=business).exists()
        resp = owner_client.get(f"/api/v1/businesses/{business.id}/settings/integration/")
        assert resp.status_code == status.HTTP_200_OK
        assert BusinessIntegrationConfig.objects.filter(business=business).count() == 1

    def test_no_duplicate_auto_provisioning(self, owner_client, business):
        from apps.settings.models import BusinessTaxConfig
        owner_client.get(f"/api/v1/businesses/{business.id}/settings/tax/")
        owner_client.get(f"/api/v1/businesses/{business.id}/settings/tax/")
        assert BusinessTaxConfig.objects.filter(business=business).count() == 1


# ============================================================
# P. INV-SET-4 Subscription Gating
# ============================================================

@pytest.mark.django_db
class TestSettingsSubscriptionGatingGreen:
    """Verify expired/suspended subscription blocks writes."""

    def test_expired_subscription_blocks_patch(self, owner_client, business, owner):
        """PATCH blocked when business subscription is EXPIRED."""
        # Create expired subscription for this business
        Subscription.objects.create(
            business=business,
            status=Subscription.Status.EXPIRED,
        )
        resp = owner_client.patch(
            f"/api/v1/businesses/{business.id}/settings/tax/",
            {"tax_rate": "5"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_expired_subscription_allows_get(self, owner_client, business):
        """GET remains allowed even with expired subscription."""
        Subscription.objects.create(
            business=business,
            status=Subscription.Status.EXPIRED,
        )
        resp = owner_client.get(
            f"/api/v1/businesses/{business.id}/settings/tax/"
        )
        assert resp.status_code == status.HTTP_200_OK


# ============================================================
# Q. INV-SET-10 Migrations
# ============================================================

@pytest.mark.django_db
class TestSettingsMigrationsGreen:
    """Verify migrations exist with correct names."""

    def test_settings_initial_migration_exists(self):
        import os
        path = "apps/settings/migrations/0001_initial.py"
        assert os.path.exists(path), f"Missing migration: {path}"

    def test_business_brand_fields_migration_exists(self):
        import os
        path = "apps/business/migrations/0003_business_brand_fields.py"
        assert os.path.exists(path), f"Missing migration: {path}"