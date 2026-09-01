import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, Location, BusinessMembership
from apps.product.models import Product, Variant
from apps.customer.models import Customer
from apps.supplier.models import Supplier
from apps.promotion_loyalty.models import Promotion
from apps.employee.models import Employee
from apps.sales.models import Sale, SaleLine, CashierShift
from apps.purchasing.models import PurchaseOrder, PurchaseOrderLine

User = get_user_model()


def _url(business_id, endpoint):
    return f"/api/v1/businesses/{business_id}/reports/{endpoint}"


@pytest.fixture
def kasir_user(db, business):
    u = User.objects.create_user(email="kasir_node19@example.com", password="SecurePass123!")
    BusinessMembership.objects.create(business=business, user=u, role=BusinessMembership.Role.KASIR)
    return u


@pytest.fixture
def admin_user(db, business):
    u = User.objects.create_user(email="admin_node19@example.com", password="SecurePass123!")
    BusinessMembership.objects.create(business=business, user=u, role=BusinessMembership.Role.ADMIN)
    return u


@pytest.fixture
def kasir_client(client, kasir_user):
    refresh = RefreshToken.for_user(kasir_user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(refresh.access_token)}"
    return client


@pytest.fixture
def admin_client(client, admin_user):
    refresh = RefreshToken.for_user(admin_user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(refresh.access_token)}"
    return client


@pytest.mark.django_db
class TestNode19ProductReportRed:
    # A. PRODUCT REPORT
    def test_product_report_endpoint_availability(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "product/"))
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        for key in ("total_products", "active_products", "inactive_products", "total_variants", "summary"):
            assert key in r.data, f"Missing key {key} in response"

    def test_product_report_aggregation(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "product/"))
        assert r.status_code == 200
        assert r.data["total_products"] == 1
        assert r.data["total_variants"] == 1

    def test_product_report_business_isolation(self, auth_client, other_business):
        r = auth_client.get(_url(other_business.id, "product/"))
        assert r.status_code == 404

    def test_product_report_rbac_admin_allowed(self, admin_client, business):
        r = admin_client.get(_url(business.id, "product/"))
        assert r.status_code == 200

    def test_product_report_rbac_kasir_denied(self, kasir_client, business):
        r = kasir_client.get(_url(business.id, "product/"))
        assert r.status_code == 403

    def test_product_report_rbac_unauthenticated_denied(self, client, business):
        r = client.get(_url(business.id, "product/"))
        assert r.status_code in (401, 403)

    def test_product_report_location_filter(self, auth_client, business, report_dataset):
        loc = Location.objects.filter(business=business).first()
        r = auth_client.get(_url(business.id, "product/"), {"location_id": str(loc.id)})
        assert r.status_code == 200


@pytest.mark.django_db
class TestNode19CustomerReportRed:
    # B. CUSTOMER REPORT
    def test_customer_report_endpoint_availability(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "customer/"))
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        for key in ("total_customers", "active_customers", "customer_growth", "top_customers"):
            assert key in r.data, f"Missing key {key} in response"

    def test_customer_report_aggregation(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "customer/"))
        assert r.status_code == 200
        assert r.data["total_customers"] == 1

    def test_customer_report_business_isolation(self, auth_client, other_business):
        r = auth_client.get(_url(other_business.id, "customer/"))
        assert r.status_code == 404

    def test_customer_report_rbac_admin_allowed(self, admin_client, business):
        r = admin_client.get(_url(business.id, "customer/"))
        assert r.status_code == 200

    def test_customer_report_rbac_kasir_denied(self, kasir_client, business):
        r = kasir_client.get(_url(business.id, "customer/"))
        assert r.status_code == 403

    def test_customer_report_location_filter(self, auth_client, business, report_dataset):
        loc = Location.objects.filter(business=business).first()
        r = auth_client.get(_url(business.id, "customer/"), {"location_id": str(loc.id)})
        assert r.status_code == 200


@pytest.mark.django_db
class TestNode19SupplierReportRed:
    # C. SUPPLIER REPORT
    def test_supplier_report_endpoint_availability(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "supplier/"))
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        for key in ("total_suppliers", "active_suppliers", "purchase_volume", "purchase_value", "supplier_activity"):
            assert key in r.data, f"Missing key {key} in response"

    def test_supplier_report_aggregation(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "supplier/"))
        assert r.status_code == 200
        assert r.data["total_suppliers"] == 1

    def test_supplier_report_business_isolation(self, auth_client, other_business):
        r = auth_client.get(_url(other_business.id, "supplier/"))
        assert r.status_code == 404

    def test_supplier_report_rbac_admin_allowed(self, admin_client, business):
        r = admin_client.get(_url(business.id, "supplier/"))
        assert r.status_code == 200

    def test_supplier_report_rbac_kasir_denied(self, kasir_client, business):
        r = kasir_client.get(_url(business.id, "supplier/"))
        assert r.status_code == 403

    def test_supplier_report_location_filter(self, auth_client, business, report_dataset):
        loc = Location.objects.filter(business=business).first()
        r = auth_client.get(_url(business.id, "supplier/"), {"location_id": str(loc.id)})
        assert r.status_code == 200


@pytest.mark.django_db
class TestNode19PromotionReportRed:
    # D. PROMOTION REPORT
    def test_promotion_report_endpoint_availability(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "promotion/"))
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        for key in ("promotion_usage", "redemption_count", "discount_summary", "performance"):
            assert key in r.data, f"Missing key {key} in response"

    def test_promotion_report_aggregation(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "promotion/"))
        assert r.status_code == 200

    def test_promotion_report_business_isolation(self, auth_client, other_business):
        r = auth_client.get(_url(other_business.id, "promotion/"))
        assert r.status_code == 404

    def test_promotion_report_rbac_admin_allowed(self, admin_client, business):
        r = admin_client.get(_url(business.id, "promotion/"))
        assert r.status_code == 200

    def test_promotion_report_rbac_kasir_denied(self, kasir_client, business):
        r = kasir_client.get(_url(business.id, "promotion/"))
        assert r.status_code == 403

    def test_promotion_report_location_filter(self, auth_client, business, report_dataset):
        loc = Location.objects.filter(business=business).first()
        r = auth_client.get(_url(business.id, "promotion/"), {"location_id": str(loc.id)})
        assert r.status_code == 200


@pytest.mark.django_db
class TestNode19EmployeeReportRed:
    # E. EMPLOYEE REPORT
    def test_employee_report_endpoint_availability(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "employee/"))
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        for key in ("employee_count", "active_employee_count", "employee_sales_summary", "shift_activity"):
            assert key in r.data, f"Missing key {key} in response"

    def test_employee_report_aggregation(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "employee/"))
        assert r.status_code == 200
        assert r.data["employee_count"] == 2
        assert r.data["active_employee_count"] == 1

    def test_employee_report_business_isolation(self, auth_client, other_business):
        r = auth_client.get(_url(other_business.id, "employee/"))
        assert r.status_code == 404

    def test_employee_report_rbac_admin_allowed(self, admin_client, business):
        r = admin_client.get(_url(business.id, "employee/"))
        assert r.status_code == 200

    def test_employee_report_rbac_kasir_denied(self, kasir_client, business):
        r = kasir_client.get(_url(business.id, "employee/"))
        assert r.status_code == 403

    def test_employee_report_location_filter(self, auth_client, business, report_dataset):
        loc = Location.objects.filter(business=business).first()
        r = auth_client.get(_url(business.id, "employee/"), {"location_id": str(loc.id)})
        assert r.status_code == 200


@pytest.mark.django_db
class TestNode19CsvExportRed:
    # I. CSV EXPORT
    def test_csv_export_endpoint_availability_and_content_type(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "export/sales/csv/"))
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        assert r.headers.get("Content-Type") == "text/csv", f"Expected text/csv, got {r.headers.get('Content-Type')}"

    def test_csv_export_business_isolation(self, auth_client, other_business):
        r = auth_client.get(_url(other_business.id, "export/sales/csv/"))
        assert r.status_code == 404

    def test_csv_export_rbac_admin_allowed(self, admin_client, business):
        r = admin_client.get(_url(business.id, "export/sales/csv/"))
        assert r.status_code == 200

    def test_csv_export_rbac_kasir_denied(self, kasir_client, business):
        r = kasir_client.get(_url(business.id, "export/sales/csv/"))
        assert r.status_code == 403


@pytest.mark.django_db
class TestNode19XlsxExportRed:
    # J. XLSX EXPORT
    def test_xlsx_export_endpoint_availability_and_content_type(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "export/sales/xlsx/"))
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        expected_ct = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        assert r.headers.get("Content-Type") == expected_ct, f"Expected {expected_ct}, got {r.headers.get('Content-Type')}"

    def test_xlsx_export_business_isolation(self, auth_client, other_business):
        r = auth_client.get(_url(other_business.id, "export/sales/xlsx/"))
        assert r.status_code == 404

    def test_xlsx_export_rbac_admin_allowed(self, admin_client, business):
        r = admin_client.get(_url(business.id, "export/sales/xlsx/"))
        assert r.status_code == 200

    def test_xlsx_export_rbac_kasir_denied(self, kasir_client, business):
        r = kasir_client.get(_url(business.id, "export/sales/xlsx/"))
        assert r.status_code == 403
