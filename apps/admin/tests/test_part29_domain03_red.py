import pytest
from rest_framework import status

from apps.authentication.models import User
from apps.business.models import Business, Subscription
from apps.audit.models import AuditLog

from apps.admin.tests.conftest import client_for

pytestmark = pytest.mark.django_db

ADMIN_OWNERS = "/api/v1/admin/owners/"
OWNER_DETAIL = "/api/v1/admin/owners/{owner_id}/"


class TestDomain03OwnerListRed:
    def test_d03_01_super_admin_owner_list(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(ADMIN_OWNERS)
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.json(), list)

    def test_d03_02_owner_identity_fields(
        self, superuser, super_tokens, owner1, business1
    ):
        resp = client_for(super_tokens["access"]).get(ADMIN_OWNERS)
        assert resp.status_code == status.HTTP_200_OK
        items = resp.json()
        match = next(i for i in items if str(i["id"]) == str(owner1.id))
        assert match["email"] == owner1.email
        assert match["first_name"] == owner1.first_name
        assert match["last_name"] == owner1.last_name

    def test_d03_03_owner_status_fields(
        self, superuser, super_tokens, owner1, business1
    ):
        resp = client_for(super_tokens["access"]).get(ADMIN_OWNERS)
        assert resp.status_code == status.HTTP_200_OK
        items = resp.json()
        match = next(i for i in items if str(i["id"]) == str(owner1.id))
        assert "is_active" in match
        assert "is_email_verified" in match
        assert isinstance(match["is_active"], bool)
        assert isinstance(match["is_email_verified"], bool)

    def test_d03_04_business_aggregation(
        self, superuser, super_tokens, owner1, business1
    ):
        resp = client_for(super_tokens["access"]).get(ADMIN_OWNERS)
        assert resp.status_code == status.HTTP_200_OK
        items = resp.json()
        match = next(i for i in items if str(i["id"]) == str(owner1.id))
        assert match["business_count"] >= 1
        assert any(b["id"] == str(business1.id) for b in match["businesses"])

    def test_d03_05_subscription_summary(
        self, superuser, super_tokens, owner1, business1
    ):
        resp = client_for(super_tokens["access"]).get(ADMIN_OWNERS)
        assert resp.status_code == status.HTTP_200_OK
        items = resp.json()
        match = next(i for i in items if str(i["id"]) == str(owner1.id))
        summary = match["subscription_summary"]
        assert "total" in summary
        assert "active" in summary

    def test_d03_06_owner_list_audit_event(
        self, superuser, super_tokens, owner1
    ):
        before = AuditLog.objects.count()
        client_for(super_tokens["access"]).get(ADMIN_OWNERS)
        after = AuditLog.objects.count()
        assert after > before
        assert AuditLog.objects.filter(action="OWNER_LIST_VIEWED").exists()


class TestDomain03OwnerDetailRed:
    def test_d03_07_super_admin_owner_detail(
        self, superuser, super_tokens, owner1, business1
    ):
        resp = client_for(super_tokens["access"]).get(
            OWNER_DETAIL.format(owner_id=owner1.id)
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert str(data["id"]) == str(owner1.id)

    def test_d03_08_owner_detail_identity(
        self, superuser, super_tokens, owner1, business1
    ):
        resp = client_for(super_tokens["access"]).get(
            OWNER_DETAIL.format(owner_id=owner1.id)
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["email"] == owner1.email
        assert data["first_name"] == owner1.first_name
        assert data["last_name"] == owner1.last_name

    def test_d03_09_owner_detail_status(
        self, superuser, super_tokens, owner1, business1
    ):
        resp = client_for(super_tokens["access"]).get(
            OWNER_DETAIL.format(owner_id=owner1.id)
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert "is_active" in data
        assert "is_email_verified" in data

    def test_d03_10_owner_detail_business_aggregation(
        self, superuser, super_tokens, owner1, business1
    ):
        resp = client_for(super_tokens["access"]).get(
            OWNER_DETAIL.format(owner_id=owner1.id)
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["business_count"] >= 1
        assert any(b["id"] == str(business1.id) for b in data["businesses"])

    def test_d03_11_owner_detail_subscription_summary(
        self, superuser, super_tokens, owner1, business1
    ):
        resp = client_for(super_tokens["access"]).get(
            OWNER_DETAIL.format(owner_id=owner1.id)
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        summary = data["subscription_summary"]
        assert "total" in summary
        assert "active" in summary
        assert "expired" in summary

    def test_d03_12_owner_detail_audit_event(
        self, superuser, super_tokens, owner1, business1
    ):
        before = AuditLog.objects.count()
        client_for(super_tokens["access"]).get(
            OWNER_DETAIL.format(owner_id=owner1.id)
        )
        after = AuditLog.objects.count()
        assert after > before
        assert AuditLog.objects.filter(action="OWNER_DETAIL_VIEWED").exists()

    def test_d03_13_nonexistent_owner_returns_404(self, superuser, super_tokens):
        import uuid
        resp = client_for(super_tokens["access"]).get(
            OWNER_DETAIL.format(owner_id=uuid.uuid4())
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND


class TestDomain03AuthorizationRed:
    def test_d03_14_anonymous_denied(self, api_client):
        resp = api_client.get(ADMIN_OWNERS)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_d03_15_owner_denied(self, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).get(ADMIN_OWNERS)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_d03_16_admin_denied(self, staff_tokens):
        resp = client_for(staff_tokens["access"]).get(ADMIN_OWNERS)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_d03_17_kasir_denied(self, plain_tokens):
        resp = client_for(plain_tokens["access"]).get(ADMIN_OWNERS)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_d03_18_non_superuser_staff_denied(self, staff_tokens):
        resp = client_for(staff_tokens["access"]).get(ADMIN_OWNERS)
        assert resp.status_code == status.HTTP_403_FORBIDDEN


class TestDomain03ReadOnlyRed:
    def test_d03_19_list_mutation_rejected(self, superuser, super_tokens):
        client = client_for(super_tokens["access"])
        resp = client.post(ADMIN_OWNERS, {}, format="json")
        assert resp.status_code in (
            status.HTTP_405_METHOD_NOT_ALLOWED,
            status.HTTP_403_FORBIDDEN,
        )

    def test_d03_20_detail_mutation_rejected(self, superuser, super_tokens, owner1):
        client = client_for(super_tokens["access"])
        url = OWNER_DETAIL.format(owner_id=owner1.id)
        resp = client.patch(url, {}, format="json")
        assert resp.status_code in (
            status.HTTP_405_METHOD_NOT_ALLOWED,
            status.HTTP_403_FORBIDDEN,
        )