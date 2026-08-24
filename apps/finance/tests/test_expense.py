import pytest
from django.apps import apps

from apps.finance.models import Account


def _url(business_id, suffix=""):
    return f"/api/v1/businesses/{business_id}/expenses/{suffix}"


@pytest.mark.django_db
class TestExpense:
    def test_model_registered(self):
        try:
            apps.get_model("finance", "Expense")
        except LookupError:
            pytest.fail("Finance 'Expense' model is not implemented yet (RED expected).")

    def test_create_returns_201(self, auth_client, business):
        r = auth_client.post(
            _url(business.id),
            data={"description": "Listrik", "amount": "100000"},
            content_type="application/json",
        )
        assert r.status_code == 201, r.status_code

    def test_is_business_scoped(self):
        try:
            model = apps.get_model("finance", "Expense")
        except LookupError:
            pytest.fail("Finance 'Expense' model is not implemented yet (RED expected).")
        assert hasattr(model, "business"), "Expense must be Business-scoped."

    def test_create_with_own_business_account_returns_201(self, auth_client, business):
        account = Account.objects.create(business=business, name="Kas", code="1000")
        r = auth_client.post(
            _url(business.id),
            data={
                "account": str(account.id),
                "description": "Listrik",
                "amount": "100000",
            },
            content_type="application/json",
        )
        assert r.status_code == 201, r.status_code

    def test_create_rejects_foreign_business_account(
        self, auth_client, business, other_business
    ):
        foreign_account = Account.objects.create(
            business=other_business, name="Kas Lain", code="9999"
        )
        r = auth_client.post(
            _url(business.id),
            data={
                "account": str(foreign_account.id),
                "description": "Listrik",
                "amount": "100000",
            },
            content_type="application/json",
        )
        assert r.status_code == 404, r.status_code
