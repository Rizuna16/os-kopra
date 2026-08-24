import pytest
from django.apps import apps


def _url(business_id, suffix=""):
    return f"/api/v1/businesses/{business_id}/ledgers/{suffix}"


@pytest.mark.django_db
class TestLedger:
    def test_model_registered(self):
        try:
            apps.get_model("finance", "Ledger")
        except LookupError:
            pytest.fail("Finance 'Ledger' model is not implemented yet (RED expected).")

    def test_list_returns_200(self, auth_client, business):
        r = auth_client.get(_url(business.id))
        assert r.status_code == 200, r.status_code

    def test_is_business_scoped(self):
        try:
            model = apps.get_model("finance", "Ledger")
        except LookupError:
            pytest.fail("Finance 'Ledger' model is not implemented yet (RED expected).")
        assert hasattr(model, "business"), "Ledger must be Business-scoped."
