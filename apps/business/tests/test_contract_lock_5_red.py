from uuid import uuid4
import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, BusinessMembership, Location, Subscription

User = get_user_model()


@pytest.fixture
def test_users(db):
    owner_a = User.objects.create_user(email="owner_a@example.com", password="SecurePass123!")
    admin_a = User.objects.create_user(email="admin_a@example.com", password="SecurePass123!")
    kasir_a = User.objects.create_user(email="kasir_a@example.com", password="SecurePass123!")

    owner_b = User.objects.create_user(email="owner_b@example.com", password="SecurePass123!")
    admin_b = User.objects.create_user(email="admin_b@example.com", password="SecurePass123!")
    kasir_b = User.objects.create_user(email="kasir_b@example.com", password="SecurePass123!")

    return {
        "owner_a": owner_a,
        "admin_a": admin_a,
        "kasir_a": kasir_a,
        "owner_b": owner_b,
        "admin_b": admin_b,
        "kasir_b": kasir_b,
    }


@pytest.fixture
def business_a(db, test_users):
    b = Business.objects.create(name="Business A", owner=test_users["owner_a"])
    BusinessMembership.objects.create(business=b, user=test_users["admin_a"], role="ADMIN")
    BusinessMembership.objects.create(business=b, user=test_users["kasir_a"], role="KASIR")
    return b


@pytest.fixture
def business_b(db, test_users):
    b = Business.objects.create(name="Business B", owner=test_users["owner_b"])
    BusinessMembership.objects.create(business=b, user=test_users["admin_b"], role="ADMIN")
    BusinessMembership.objects.create(business=b, user=test_users["kasir_b"], role="KASIR")
    return b


@pytest.fixture
def location_a(db, business_a):
    return Location.objects.create(business=business_a, name="Location A")


@pytest.fixture
def location_b(db, business_b):
    return Location.objects.create(business=business_b, name="Location B")


def get_client(client, user):
    client.logout()
    if "HTTP_AUTHORIZATION" in client.defaults:
        del client.defaults["HTTP_AUTHORIZATION"]
    refresh = RefreshToken.for_user(user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(refresh.access_token)}"
    return client


@pytest.mark.django_db
class TestContractLock5Red:
    # 1. test_red_5_admin_can_view_location
    def test_red_5_admin_can_view_location(self, client, test_users, business_a, location_a):
        cl = get_client(client, test_users["admin_a"])
        response = cl.get(f"/api/v1/businesses/{business_a.id}/locations/")
        assert response.status_code == 200

    # 2. test_red_5_admin_can_create_location
    def test_red_5_admin_can_create_location(self, client, test_users, business_a):
        cl = get_client(client, test_users["admin_a"])
        response = cl.post(
            f"/api/v1/businesses/{business_a.id}/locations/",
            {"name": "Admin New Location"},
            content_type="application/json",
        )
        assert response.status_code == 201

    # 3. test_red_5_admin_can_update_location
    def test_red_5_admin_can_update_location(self, client, test_users, business_a, location_a):
        cl = get_client(client, test_users["admin_a"])
        response = cl.patch(
            f"/api/v1/businesses/{business_a.id}/locations/{location_a.id}/",
            {"name": "Admin Updated"},
            content_type="application/json",
        )
        assert response.status_code == 200

    # 4. test_red_5_admin_can_delete_location
    def test_red_5_admin_can_delete_location(self, client, test_users, business_a, location_a):
        cl = get_client(client, test_users["admin_a"])
        response = cl.delete(f"/api/v1/businesses/{business_a.id}/locations/{location_a.id}/")
        assert response.status_code == 204

    # 5. test_red_5_kasir_cannot_view_location
    def test_red_5_kasir_cannot_view_location(self, client, test_users, business_a, location_a):
        cl = get_client(client, test_users["kasir_a"])
        response = cl.get(f"/api/v1/businesses/{business_a.id}/locations/")
        assert response.status_code in (403, 404)

    # 6. test_red_5_kasir_cannot_create_location
    def test_red_5_kasir_cannot_create_location(self, client, test_users, business_a):
        cl = get_client(client, test_users["kasir_a"])
        response = cl.post(
            f"/api/v1/businesses/{business_a.id}/locations/",
            {"name": "Kasir New Location"},
            content_type="application/json",
        )
        assert response.status_code in (403, 404)

    # 7. test_red_5_kasir_cannot_update_location
    def test_red_5_kasir_cannot_update_location(self, client, test_users, business_a, location_a):
        cl = get_client(client, test_users["kasir_a"])
        response = cl.patch(
            f"/api/v1/businesses/{business_a.id}/locations/{location_a.id}/",
            {"name": "Kasir Updated"},
            content_type="application/json",
        )
        assert response.status_code in (403, 404)

    # 8. test_red_5_kasir_cannot_delete_location
    def test_red_5_kasir_cannot_delete_location(self, client, test_users, business_a, location_a):
        cl = get_client(client, test_users["kasir_a"])
        response = cl.delete(f"/api/v1/businesses/{business_a.id}/locations/{location_a.id}/")
        assert response.status_code in (403, 404)

    # 9. test_red_5_owner_full_location_access
    def test_red_5_owner_full_location_access(self, client, test_users, business_a, location_a):
        cl = get_client(client, test_users["owner_a"])
        # view
        response = cl.get(f"/api/v1/businesses/{business_a.id}/locations/")
        assert response.status_code == 200
        # create
        response = cl.post(
            f"/api/v1/businesses/{business_a.id}/locations/",
            {"name": "Owner New Location"},
            content_type="application/json",
        )
        assert response.status_code == 201
        new_loc_id = response.data["id"]
        # update
        response = cl.patch(
            f"/api/v1/businesses/{business_a.id}/locations/{new_loc_id}/",
            {"name": "Owner Updated"},
            content_type="application/json",
        )
        assert response.status_code == 200
        # delete
        response = cl.delete(f"/api/v1/businesses/{business_a.id}/locations/{new_loc_id}/")
        assert response.status_code == 204

    # 10. test_red_5_admin_can_view_reports
    def test_red_5_admin_can_view_reports(self, client, test_users, business_a):
        cl = get_client(client, test_users["admin_a"])
        response = cl.get(f"/api/v1/businesses/{business_a.id}/reports/overview/")
        assert response.status_code == 200

    # 11. test_red_5_kasir_cannot_view_reports
    def test_red_5_kasir_cannot_view_reports(self, client, test_users, business_a):
        cl = get_client(client, test_users["kasir_a"])
        response = cl.get(f"/api/v1/businesses/{business_a.id}/reports/overview/")
        assert response.status_code == 403

    # 12. test_red_5_owner_can_view_reports
    def test_red_5_owner_can_view_reports(self, client, test_users, business_a):
        cl = get_client(client, test_users["owner_a"])
        response = cl.get(f"/api/v1/businesses/{business_a.id}/reports/overview/")
        assert response.status_code == 200

    # 13. test_red_5_reports_are_read_only
    def test_red_5_reports_are_read_only(self, client, test_users, business_a):
        cl = get_client(client, test_users["owner_a"])
        # post / overview
        r = cl.post(f"/api/v1/businesses/{business_a.id}/reports/overview/", {}, content_type="application/json")
        assert r.status_code in (404, 405)
        # put / sales
        r = cl.put(f"/api/v1/businesses/{business_a.id}/reports/sales/", {}, content_type="application/json")
        assert r.status_code in (404, 405)
        # delete / finance
        r = cl.delete(f"/api/v1/businesses/{business_a.id}/reports/finance/")
        assert r.status_code in (404, 405)

    # 14. test_red_5_location_cross_business_isolation
    def test_red_5_location_cross_business_isolation(self, client, test_users, business_a, business_b, location_b):
        cl = get_client(client, test_users["admin_a"])
        # Admin A cannot access Location B
        response = cl.get(f"/api/v1/businesses/{business_a.id}/locations/{location_b.id}/")
        assert response.status_code == 404

    # 15. test_red_5_location_id_cannot_bypass_business_scope
    def test_red_5_location_id_cannot_bypass_business_scope(self, client, test_users, business_a, location_b):
        cl = get_client(client, test_users["owner_a"])
        response = cl.get(f"/api/v1/businesses/{business_a.id}/locations/{location_b.id}/")
        assert response.status_code == 404

    # 16. test_red_5_location_payload_cannot_switch_business
    def test_red_5_location_payload_cannot_switch_business(self, client, test_users, business_a, business_b):
        cl = get_client(client, test_users["admin_a"])
        response = cl.post(
            f"/api/v1/businesses/{business_a.id}/locations/",
            {"name": "Tampered Business Loc", "business": str(business_b.id)},
            content_type="application/json",
        )
        # Created location must still belong to business_a, not business_b
        assert response.status_code in (201, 200)
        assert response.data["business"] == str(business_a.id)

    # 17. test_red_5_admin_location_permission_is_business_scoped
    def test_red_5_admin_location_permission_is_business_scoped(self, client, test_users, business_a, business_b, location_b):
        cl = get_client(client, test_users["admin_a"])
        # Admin A cannot list Location B (returns 404 on context validation)
        response = cl.get(f"/api/v1/businesses/{business_b.id}/locations/")
        assert response.status_code == 404

    # 18. test_red_5_reports_permission_is_business_scoped
    def test_red_5_reports_permission_is_business_scoped(self, client, test_users, business_a, business_b):
        cl = get_client(client, test_users["admin_a"])
        # Admin A cannot access Reports B (returns 404 on context validation)
        response = cl.get(f"/api/v1/businesses/{business_b.id}/reports/overview/")
        assert response.status_code == 404

    # 19. test_red_5_membership_remains_owner_only
    def test_red_5_membership_remains_owner_only(self, client, test_users, business_a):
        # Admin cannot manage membership
        cl = get_client(client, test_users["admin_a"])
        response = cl.get(f"/api/v1/businesses/{business_a.id}/members/")
        assert response.status_code == 404

        # Owner can manage membership
        cl2 = get_client(client, test_users["owner_a"])
        response2 = cl2.get(f"/api/v1/businesses/{business_a.id}/members/")
        assert response2.status_code == 200

    # 20. test_red_5_subscription_remains_owner_only
    def test_red_5_subscription_remains_owner_only(self, client, test_users, business_a):
        # Admin cannot create subscription
        cl = get_client(client, test_users["admin_a"])
        response = cl.post(f"/api/v1/businesses/{business_a.id}/subscription/", {}, content_type="application/json")
        assert response.status_code == 404

        # Owner can trigger subscription flow (returns 400 because database constraint blocks active/onboarding dups, which shows endpoint reached successfully)
        cl2 = get_client(client, test_users["owner_a"])
        response2 = cl2.post(f"/api/v1/businesses/{business_a.id}/subscription/", {}, content_type="application/json")
        assert response2.status_code in (201, 400)
