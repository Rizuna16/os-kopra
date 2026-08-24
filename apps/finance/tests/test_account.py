import pytest
from django.apps import apps


def _url(business_id, suffix=""):
    return f"/api/v1/businesses/{business_id}/accounts/{suffix}"


@pytest.mark.django_db
class TestAccount:
    def test_model_registered(self):
        try:
            apps.get_model("finance", "Account")
        except LookupError:
            pytest.fail("Finance 'Account' model is not implemented yet (RED expected).")

    def test_create_returns_201(self, auth_client, business):
        r = auth_client.post(
            _url(business.id),
            data={"name": "Kas", "code": "1000"},
            content_type="application/json",
        )
        assert r.status_code == 201, r.status_code

    def test_list_returns_200(self, auth_client, business):
        r = auth_client.get(_url(business.id))
        assert r.status_code == 200, r.status_code

    def test_requires_authentication(self, client, business):
        r = client.get(_url(business.id))
        assert r.status_code in (401, 403), r.status_code

    def test_is_business_scoped(self):
        try:
            model = apps.get_model("finance", "Account")
        except LookupError:
            pytest.fail("Finance 'Account' model is not implemented yet (RED expected).")
        assert hasattr(model, "business"), "Account must be Business-scoped."
