import pytest
from django.apps import apps

from apps.finance.models import Account, Journal


def _url(business_id, journal_id, suffix=""):
    return f"/api/v1/businesses/{business_id}/journals/{journal_id}/entries/{suffix}"


@pytest.mark.django_db
class TestJournalEntry:
    def test_model_registered(self):
        try:
            apps.get_model("finance", "JournalEntry")
        except LookupError:
            pytest.fail("Finance 'JournalEntry' model is not implemented yet (RED expected).")

    def test_create_returns_201(self, auth_client, business):
        account = Account.objects.create(business=business, name="Kas", code="1000")
        journal = Journal.objects.create(
            business=business, reference="JRN-001", memo="Opname"
        )
        r = auth_client.post(
            _url(business.id, journal.id),
            data={
                "journal": str(journal.id),
                "account": str(account.id),
                "entry_type": "DEBIT",
                "amount": "100000",
            },
            content_type="application/json",
        )
        assert r.status_code == 201, r.status_code

    def test_belongs_to_journal(self):
        try:
            model = apps.get_model("finance", "JournalEntry")
        except LookupError:
            pytest.fail("Finance 'JournalEntry' model is not implemented yet (RED expected).")
        assert hasattr(model, "journal"), "JournalEntry must belong to a Journal."

    def test_create_rejects_foreign_business_account(
        self, auth_client, business, other_business
    ):
        foreign_account = Account.objects.create(
            business=other_business, name="Kas Lain", code="9999"
        )
        journal = Journal.objects.create(
            business=business, reference="JRN-SEC", memo="security"
        )
        r = auth_client.post(
            _url(business.id, journal.id),
            data={
                "journal": str(journal.id),
                "account": str(foreign_account.id),
                "entry_type": "DEBIT",
                "amount": "100000",
            },
            content_type="application/json",
        )
        assert r.status_code == 404, r.status_code
