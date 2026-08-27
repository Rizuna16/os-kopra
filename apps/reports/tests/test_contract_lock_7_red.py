import pytest
import inspect
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, BusinessMembership
from apps.authentication.permissions import BusinessAccessMixin
from apps.reports import views as reports_views

User = get_user_model()


@pytest.fixture
def lock7_users(db):
    owner = User.objects.create_user(email="owner_l7@example.com", password="SecurePass123!")
    admin = User.objects.create_user(email="admin_l7@example.com", password="SecurePass123!")
    kasir = User.objects.create_user(email="kasir_l7@example.com", password="SecurePass123!")
    other_owner = User.objects.create_user(email="other_l7@example.com", password="SecurePass123!")
    return {
        "owner": owner,
        "admin": admin,
        "kasir": kasir,
        "other_owner": other_owner,
    }


@pytest.fixture
def lock7_business(db, lock7_users):
    b = Business.objects.create(name="Business Lock 7", owner=lock7_users["owner"])
    BusinessMembership.objects.create(business=b, user=lock7_users["admin"], role="ADMIN")
    BusinessMembership.objects.create(business=b, user=lock7_users["kasir"], role="KASIR")
    return b


@pytest.fixture
def lock7_other_business(db, lock7_users):
    return Business.objects.create(name="Business Other Lock 7", owner=lock7_users["other_owner"])


def get_client(client, user):
    client.logout()
    if "HTTP_AUTHORIZATION" in client.defaults:
        del client.defaults["HTTP_AUTHORIZATION"]
    refresh = RefreshToken.for_user(user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(refresh.access_token)}"
    return client


@pytest.mark.django_db
class TestContractLock7ReportsRed:
    # 5. Static assertion: get_owned_business() dead code is removed
    def test_reports_dead_code_removed(self):
        source = inspect.getsource(reports_views)
        assert "def get_owned_business" not in source, (
            "reports/views.py get_owned_business() dead code must be removed"
        )

    # 6. Verify all report views continue using BusinessAccessMixin & require_business_permission("reports", "view")
    def test_reports_views_canonical_permissions(self):
        source = inspect.getsource(reports_views)
        # Verify classes inherit BusinessAccessMixin and use require_business_permission
        assert issubclass(reports_views.OverviewView, BusinessAccessMixin)
        assert issubclass(reports_views.SalesReportView, BusinessAccessMixin)
        assert issubclass(reports_views.PurchasingReportView, BusinessAccessMixin)
        assert issubclass(reports_views.FinanceReportView, BusinessAccessMixin)

        # Statically verify views call require_business_permission("reports", "view")
        overview_src = inspect.getsource(reports_views.OverviewView)
        sales_src = inspect.getsource(reports_views.SalesReportView)
        purchasing_src = inspect.getsource(reports_views.PurchasingReportView)
        finance_src = inspect.getsource(reports_views.FinanceReportView)

        assert 'require_business_permission("reports", "view")' in overview_src
        assert 'require_business_permission("reports", "view")' in sales_src
        assert 'require_business_permission("reports", "view")' in purchasing_src
        assert 'require_business_permission("reports", "view")' in finance_src

    # 7. Existing report behavior: owner/admin 200, kasir 403, non-member 404
    def test_reports_access_behavior_contract(self, client, lock7_users, lock7_business, lock7_other_business):
        # Owner -> 200 OK
        cl = get_client(client, lock7_users["owner"])
        r = cl.get(f"/api/v1/businesses/{lock7_business.id}/reports/overview/")
        assert r.status_code == 200

        # Admin -> 200 OK
        cl = get_client(client, lock7_users["admin"])
        r = cl.get(f"/api/v1/businesses/{lock7_business.id}/reports/overview/")
        assert r.status_code == 200

        # Kasir -> 403 Forbidden (reports:view is False for KASIR)
        cl = get_client(client, lock7_users["kasir"])
        r = cl.get(f"/api/v1/businesses/{lock7_business.id}/reports/overview/")
        assert r.status_code == 403

        # Non-member -> 404 Not Found (resolved through BusinessAccessMixin.get_business())
        cl = get_client(client, lock7_users["other_owner"])
        r = cl.get(f"/api/v1/businesses/{lock7_business.id}/reports/overview/")
        assert r.status_code == 404
