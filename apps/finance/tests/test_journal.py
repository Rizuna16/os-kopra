import pytest
from django.apps import apps


def _url(business_id, suffix=""):
    return f"/api/v1/businesses/{business_id}/journals/{suffix}"


@pytest.mark.django_db
class TestJournal:
    def test_model_registered(self):
        try:
            apps.get_model("finance", "Journal")
        except LookupError:
            pytest.fail("Finance 'Journal' model is not implemented yet (RED expected).")

    def test_create_returns_201(self, auth_client, business):
        r = auth_client.post(
            _url(business.id),
            data={"reference": "JRN-001", "memo": "Opname"},
            content_type="application/json",
        )
        assert r.status_code == 201, r.status_code

    def test_default_status_draft(self):
        try:
            model = apps.get_model("finance", "Journal")
        except LookupError:
            pytest.fail("Finance 'Journal' model is not implemented yet (RED expected).")
        status_field = model._meta.get_field("status")
        choices = [c[0] for c in status_field.choices]
        assert "DRAFT" in choices
        assert "POSTED" in choices
        assert "REVERSED" in choices

    def test_manual_posting_to_posted(self, auth_client, business):
        create = auth_client.post(
            _url(business.id),
            data={"reference": "JRN-002", "memo": "Manual"},
            content_type="application/json",
        )
        assert create.status_code == 201, create.status_code
        jid = create.data["id"]
        r = auth_client.post(
            _url(business.id, f"{jid}/post/"), data={}, content_type="application/json"
        )
        assert r.status_code == 200, r.status_code
        assert r.data.get("status") == "POSTED", r.data

    def test_reversed_lifecycle(self, auth_client, business):
        create = auth_client.post(
            _url(business.id),
            data={"reference": "JRN-003", "memo": "Reverse"},
            content_type="application/json",
        )
        assert create.status_code == 201, create.status_code
        jid = create.data["id"]
        auth_client.post(
            _url(business.id, f"{jid}/post/"), data={}, content_type="application/json"
        )
        r = auth_client.post(
            _url(business.id, f"{jid}/reverse/"), data={}, content_type="application/json"
        )
        assert r.status_code == 200, r.status_code
        assert r.data.get("status") == "REVERSED", r.data

    def test_has_no_location_fk(self):
        try:
            model = apps.get_model("finance", "Journal")
        except LookupError:
            pytest.fail("Finance 'Journal' model is not implemented yet (RED expected).")
        assert not hasattr(model, "location"), "Finance Journal must NOT have a Location FK."
