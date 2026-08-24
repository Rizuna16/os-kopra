import pytest
from django.apps import apps


def _account_url(business_id, suffix=""):
    return f"/api/v1/businesses/{business_id}/accounts/{suffix}"


def _ledger_url(business_id, suffix=""):
    return f"/api/v1/businesses/{business_id}/ledgers/{suffix}"


@pytest.mark.django_db
class TestFinanceSecurity:
    def test_app_registered(self):
        if not apps.is_installed("finance"):
            pytest.fail("Finance app is not installed/registered yet (RED expected).")

    def test_owner_can_create_account(self, auth_client, business):
        r = auth_client.post(
            _account_url(business.id),
            data={"name": "Kas", "code": "1000"},
            content_type="application/json",
        )
        assert r.status_code == 201, r.status_code

    def test_expense_requires_authentication(self, client, business):
        r = client.get(_account_url(business.id))
        assert r.status_code in (401, 403), r.status_code

    def test_ledger_requires_authentication(self, client, business):
        r = client.get(_ledger_url(business.id))
        assert r.status_code in (401, 403), r.status_code
