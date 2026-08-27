import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.exceptions import ObjectDoesNotExist

from apps.business.models import Business, BusinessMembership

User = get_user_model()


@pytest.fixture
def owner_user(db):
    return User.objects.create_user(email="owner_4b@example.com", password="SecurePass123!")


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(email="admin_4b@example.com", password="SecurePass123!")


@pytest.fixture
def kasir_user(db):
    return User.objects.create_user(email="kasir_4b@example.com", password="SecurePass123!")


@pytest.fixture
def business_a(db, owner_user):
    return Business.objects.create(name="Business A", owner=owner_user)


def auth_client_for(user):
    from rest_framework.test import APIClient
    client = APIClient()
    token = RefreshToken.for_user(user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(token.access_token)}"
    return client


@pytest.mark.django_db
class TestRolePermissionsRed:
    def test_red_4b_owner_full_access(self, owner_user, business_a):
        # OWNER has full access to all domain endpoints (e.g. employee list)
        client = auth_client_for(owner_user)
        response = client.get(f"/api/v1/businesses/{business_a.id}/employees/")
        assert response.status_code == 200

    def test_red_4b_admin_allowed_access(self, admin_user, business_a):
        # Setup: ADMIN membership
        BusinessMembership.objects.create(business=business_a, user=admin_user, role="ADMIN")
        client = auth_client_for(admin_user)
        
        # Admin is allowed to view/manage employees
        response = client.get(f"/api/v1/businesses/{business_a.id}/employees/")
        assert response.status_code == 200

    def test_red_4b_admin_denied_membership_management(self, admin_user, business_a):
        # Setup: ADMIN membership
        BusinessMembership.objects.create(business=business_a, user=admin_user, role="ADMIN")
        client = auth_client_for(admin_user)
        
        # Admin is denied from managing membership
        response = client.get(f"/api/v1/businesses/{business_a.id}/members/")
        assert response.status_code in [403, 404]

    def test_red_4b_kasir_allowed_sales_access(self, kasir_user, business_a):
        # Setup: KASIR membership
        BusinessMembership.objects.create(business=business_a, user=kasir_user, role="KASIR")
        client = auth_client_for(kasir_user)
        
        # Kasir is allowed to view sales
        response = client.get(f"/api/v1/businesses/{business_a.id}/sales/")
        assert response.status_code == 200

    def test_red_4b_kasir_denied_employee_management(self, kasir_user, business_a):
        # Setup: KASIR membership
        BusinessMembership.objects.create(business=business_a, user=kasir_user, role="KASIR")
        client = auth_client_for(kasir_user)
        
        # Kasir is denied from viewing/managing employees
        response = client.get(f"/api/v1/businesses/{business_a.id}/employees/")
        assert response.status_code in [403, 404]

    def test_red_4b_kasir_denied_finance_modification(self, kasir_user, business_a):
        # Setup: KASIR membership
        BusinessMembership.objects.create(business=business_a, user=kasir_user, role="KASIR")
        client = auth_client_for(kasir_user)
        
        # Kasir is denied from journal list
        response = client.get(f"/api/v1/businesses/{business_a.id}/journals/")
        assert response.status_code in [403, 404]

    def test_red_4b_admin_allowed_finance_read_only(self, admin_user, business_a):
        # Setup: ADMIN membership
        BusinessMembership.objects.create(business=business_a, user=admin_user, role="ADMIN")
        client = auth_client_for(admin_user)
        
        # Admin is allowed to READ/list finance accounts
        response = client.get(f"/api/v1/businesses/{business_a.id}/accounts/")
        assert response.status_code == 200

    def test_red_4b_admin_denied_finance_create(self, admin_user, business_a):
        # Setup: ADMIN membership
        BusinessMembership.objects.create(business=business_a, user=admin_user, role="ADMIN")
        client = auth_client_for(admin_user)
        
        # Admin is denied from creating journal
        response = client.post(
            f"/api/v1/businesses/{business_a.id}/journals/",
            {"name": "Journal B", "date": "2026-08-27"},
            content_type="application/json"
        )
        assert response.status_code in [403, 404]

    def test_red_4b_cross_business_isolation_role(self, admin_user, owner_user, business_a):
        # Setup: Account is ADMIN in Business A, but has no role in Business B
        business_b = Business.objects.create(name="Business B", owner=owner_user)
        BusinessMembership.objects.create(business=business_a, user=admin_user, role="ADMIN")
        
        client = auth_client_for(admin_user)
        # Attempting to access Business B employees
        response = client.get(f"/api/v1/businesses/{business_b.id}/employees/")
        assert response.status_code in [403, 404]

    def test_red_4b_owner_cannot_be_spoofed_via_membership_payload(self, admin_user, business_a):
        # Try to pass "OWNER" role in payload or change membership
        client = auth_client_for(admin_user)
        response = client.post(
            f"/api/v1/businesses/{business_a.id}/members/",
            {"user_id": str(admin_user.id), "role": "OWNER"},
            content_type="application/json"
        )
        assert response.status_code in [403, 404]

    def test_red_4b_superadmin_remains_isolated_from_membership(self, db):
        super_user = User.objects.create_superuser(email="super_4b@example.com", password="SecurePass123!")
        assert super_user.is_superuser
        # Super admin should not require business membership to pass platform admin views
        from apps.admin.permissions import IsSuperAdmin
        permission = IsSuperAdmin()
        # Mock request
        class MockRequest:
            user = super_user
        assert permission.has_permission(MockRequest(), None) is True

    def test_red_4b_no_global_user_role_field(self, owner_user):
        with pytest.raises(AttributeError):
            _ = owner_user.role

    def test_red_4b_no_employee_role_field(self, business_a, owner_user):
        from apps.employee.models import Employee
        employee = Employee.objects.create(business=business_a, user=owner_user, name="Budi")
        with pytest.raises(AttributeError):
            _ = employee.role
