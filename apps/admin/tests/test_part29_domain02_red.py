import pytest
from rest_framework import status

from apps.authentication.models import User
from apps.business.models import Business, Subscription
from apps.audit.models import AuditLog

from apps.admin.tests.conftest import client_for

pytestmark = pytest.mark.django_db

ADMIN_ACCOUNTS = "/api/v1/admin/accounts/"
ACCOUNT_DETAIL = "/api/v1/admin/accounts/{owner_user_id}/"


class TestDomain02AccountListRed:
    def test_d02_01_super_admin_account_list(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(ADMIN_ACCOUNTS)
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.json(), list)

    def test_d02_02_account_list_owner_identity_summary(
        self, superuser, super_tokens, owner1, business1
    ):
        resp = client_for(super_tokens["access"]).get(ADMIN_ACCOUNTS)
        assert resp.status_code == status.HTTP_200_OK
        items = resp.json()
        assert any(str(i["owner_id"]) == str(owner1.id) for i in items)
        match = next(i for i in items if str(i["owner_id"]) == str(owner1.id))
        assert match["owner_email"] == owner1.email
        assert "owner_name" in match

    def test_d02_03_account_list_business_aggregation(
        self, superuser, super_tokens, owner1, business1
    ):
        resp = client_for(super_tokens["access"]).get(ADMIN_ACCOUNTS)
        assert resp.status_code == status.HTTP_200_OK
        match = next(
            i for i in resp.json() if str(i["owner_id"]) == str(owner1.id)
        )
        assert match["business_count"] >= 1
        assert any(b["id"] == str(business1.id) for b in match["businesses"])

    def test_d02_04_account_list_subscription_summary(
        self, superuser, super_tokens, owner1, business1
    ):
        resp = client_for(super_tokens["access"]).get(ADMIN_ACCOUNTS)
        assert resp.status_code == status.HTTP_200_OK
        match = next(
            i for i in resp.json() if str(i["owner_id"]) == str(owner1.id)
        )
        summary = match["subscription_summary"]
        assert "total" in summary
        assert "active" in summary
        assert "expired" in summary

    def test_d02_05_account_list_audit_event(
        self, superuser, super_tokens, owner1
    ):
        before = AuditLog.objects.count()
        client_for(super_tokens["access"]).get(ADMIN_ACCOUNTS)
        after = AuditLog.objects.count()
        assert after > before
        assert AuditLog.objects.filter(action="ACCOUNT_LIST_VIEWED").exists()


class TestDomain02AccountDetailRed:
    def test_d02_06_super_admin_account_detail(
        self, superuser, super_tokens, owner1, business1
    ):
        resp = client_for(super_tokens["access"]).get(
            ACCOUNT_DETAIL.format(owner_user_id=owner1.id)
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert str(data["owner_id"]) == str(owner1.id)

    def test_d02_07_account_detail_user_aggregation(
        self, superuser, super_tokens, owner1, business1
    ):
        resp = client_for(super_tokens["access"]).get(
            ACCOUNT_DETAIL.format(owner_user_id=owner1.id)
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "user_count" in resp.json()

    def test_d02_08_account_detail_business_aggregation(
        self, superuser, super_tokens, owner1, business1
    ):
        resp = client_for(super_tokens["access"]).get(
            ACCOUNT_DETAIL.format(owner_user_id=owner1.id)
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["business_count"] >= 1
        assert any(b["id"] == str(business1.id) for b in data["businesses"])

    def test_d02_09_account_detail_not_found(self, superuser, super_tokens):
        import uuid

        resp = client_for(super_tokens["access"]).get(
            ACCOUNT_DETAIL.format(owner_user_id=uuid.uuid4())
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_d02_10_account_detail_audit_event(
        self, superuser, super_tokens, owner1, business1
    ):
        before = AuditLog.objects.count()
        client_for(super_tokens["access"]).get(
            ACCOUNT_DETAIL.format(owner_user_id=owner1.id)
        )
        after = AuditLog.objects.count()
        assert after > before
        assert AuditLog.objects.filter(action="ACCOUNT_DETAIL_VIEWED").exists()


class TestDomain02AuthorizationRed:
    def test_d02_11_anonymous_denied(self, api_client):
        resp = api_client.get(ADMIN_ACCOUNTS)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_d02_12_owner_denied(self, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).get(ADMIN_ACCOUNTS)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_d02_13_admin_denied(self, staff_tokens):
        resp = client_for(staff_tokens["access"]).get(ADMIN_ACCOUNTS)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_d02_14_kasir_denied(self, plain_tokens):
        resp = client_for(plain_tokens["access"]).get(ADMIN_ACCOUNTS)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_d02_15_staff_non_superuser_denied(self, staff_tokens):
        resp = client_for(staff_tokens["access"]).get(ADMIN_ACCOUNTS)
        assert resp.status_code == status.HTTP_403_FORBIDDEN


class TestDomain02ReadOnlyRed:
    def test_d02_16_list_mutation_rejected(self, superuser, super_tokens):
        client = client_for(super_tokens["access"])
        resp = client.post(ADMIN_ACCOUNTS, {}, format="json")
        assert resp.status_code in (
            status.HTTP_405_METHOD_NOT_ALLOWED,
            status.HTTP_403_FORBIDDEN,
        )

    def test_d02_17_detail_mutation_rejected(self, superuser, super_tokens, owner1):
        client = client_for(super_tokens["access"])
        url = ACCOUNT_DETAIL.format(owner_user_id=owner1.id)
        resp = client.patch(url, {}, format="json")
        assert resp.status_code in (
            status.HTTP_405_METHOD_NOT_ALLOWED,
            status.HTTP_403_FORBIDDEN,
        )
