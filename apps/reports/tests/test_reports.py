import importlib
import pytest
from datetime import timedelta

from django.apps import apps


def _url(business_id, suffix=""):
    return f"/api/v1/businesses/{business_id}/reports/{suffix}"


@pytest.mark.django_db
class TestReports:
    # A. Registration
    def test_implementation_not_registered(self):
        try:
            importlib.import_module("apps.reports.views")
        except ModuleNotFoundError:
            pytest.fail("Reports implementation not present yet (RED expected).")

    # B. Authentication
    def test_overview_requires_authentication(self, client, business):
        r = client.get(_url(business.id, "overview/"))
        assert r.status_code in (401, 403), r.status_code

    def test_sales_requires_authentication(self, client, business):
        r = client.get(_url(business.id, "sales/"))
        assert r.status_code in (401, 403), r.status_code

    def test_purchasing_requires_authentication(self, client, business):
        r = client.get(_url(business.id, "purchasing/"))
        assert r.status_code in (401, 403), r.status_code

    def test_finance_requires_authentication(self, client, business):
        r = client.get(_url(business.id, "finance/"))
        assert r.status_code in (401, 403), r.status_code

    # C. Business ownership / IDOR
    def test_owner_can_access_overview(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "overview/"))
        assert r.status_code == 200, r.status_code

    def test_cross_business_isolation(self, auth_client, business, other_business, report_dataset):
        r = auth_client.get(_url(other_business.id, "overview/"))
        assert r.status_code == 404, r.status_code

    # D/E. Routing + response contract
    def test_overview_response_shape(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "overview/"))
        assert r.status_code == 200, r.status_code
        for key in ("sales", "purchasing", "finance", "counts"):
            assert key in r.data

    def test_sales_response_shape(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "sales/"))
        assert r.status_code == 200, r.status_code
        for key in ("total", "completed", "voided", "draft", "revenue", "loyalty_earned"):
            assert key in r.data

    def test_purchasing_response_shape(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "purchasing/"))
        assert r.status_code == 200, r.status_code
        for key in ("total", "confirmed", "cancelled", "draft", "cost"):
            assert key in r.data

    def test_finance_response_shape(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "finance/"))
        assert r.status_code == 200, r.status_code
        for key in ("expense_total", "journal", "journal_entry"):
            assert key in r.data

    # F. Aggregation correctness
    def test_sales_aggregation(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "sales/"))
        assert r.status_code == 200, r.status_code
        assert r.data["total"] == 3
        assert r.data["completed"] == 1
        assert r.data["voided"] == 1
        assert r.data["draft"] == 1
        assert r.data["revenue"] == "2000.00"
        assert r.data["loyalty_earned"] == "50.00"

    def test_purchasing_aggregation(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "purchasing/"))
        assert r.status_code == 200, r.status_code
        assert r.data["total"] == 3
        assert r.data["confirmed"] == 1
        assert r.data["cancelled"] == 1
        assert r.data["draft"] == 1
        assert r.data["cost"] == "1500.00"

    def test_finance_aggregation(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "finance/"))
        assert r.status_code == 200, r.status_code
        assert r.data["expense_total"] == "300.00"
        assert r.data["journal"] == {"DRAFT": 1, "POSTED": 1, "REVERSED": 1}
        assert r.data["journal_entry"]["DEBIT"] == "1000.00"
        assert r.data["journal_entry"]["CREDIT"] == "500.00"

    def test_counts_aggregation(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "overview/"))
        assert r.status_code == 200, r.status_code
        c = r.data["counts"]
        assert c["customers"] == 1
        assert c["products"] == 1
        assert c["variants"] == 1
        assert c["employees"] == 2
        assert c["employees_active"] == 1

    # G. Date filtering
    def test_date_from_filter(self, auth_client, business, report_dataset):
        r = auth_client.get(
            _url(business.id, "sales/"), {"date_from": str(report_dataset["sale_date"])}
        )
        assert r.status_code == 200, r.status_code

    def test_date_to_filter(self, auth_client, business, report_dataset):
        r = auth_client.get(
            _url(business.id, "sales/"), {"date_to": str(report_dataset["sale_date"])}
        )
        assert r.status_code == 200, r.status_code

    def test_date_invalid_range_400(self, auth_client, business, report_dataset):
        future = report_dataset["sale_date"] + timedelta(days=10)
        past = report_dataset["sale_date"] - timedelta(days=10)
        r = auth_client.get(
            _url(business.id, "sales/"),
            {"date_from": str(future), "date_to": str(past)},
        )
        assert r.status_code == 400, r.status_code

    # H. Read-only
    def test_no_write_endpoint(self, auth_client, business):
        r = auth_client.post(
            _url(business.id, "overview/"), data={}, content_type="application/json"
        )
        assert r.status_code in (404, 405), r.status_code
