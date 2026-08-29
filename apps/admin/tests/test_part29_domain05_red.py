import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.business.models import Business, BusinessMembership
from apps.audit.models import AuditLog

User = get_user_model()


@pytest.mark.django_db
class TestDomain05UserManagementRed:
    def setup_method(self):
        self.client = APIClient()
        self.superuser = User.objects.create_superuser(
            email="super@kopera.io", password="password123", is_superuser=True, is_staff=True
        )
        self.owner = User.objects.create_user(
            email="owner@kopera.io", password="password123", is_staff=False
        )
        self.admin_user = User.objects.create_user(
            email="admin@kopera.io", password="password123", is_staff=False
        )
        self.cashier = User.objects.create_user(
            email="cashier@kopera.io", password="password123", is_staff=False
        )
        self.staff_non_super = User.objects.create_user(
            email="staff@kopera.io", password="password123", is_staff=True, is_superuser=False
        )

        self.business = Business.objects.create(
            name="Toko Makmur Jaya",
            owner=self.owner,
            status=Business.Status.ACTIVE,
        )
        BusinessMembership.objects.create(
            business=self.business, user=self.admin_user, role=BusinessMembership.Role.ADMIN
        )
        BusinessMembership.objects.create(
            business=self.business, user=self.cashier, role=BusinessMembership.Role.KASIR
        )

    def test_d05_01_user_list_200(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get("/api/v1/admin/users/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 5

    def test_d05_02_user_identity_fields(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get("/api/v1/admin/users/")
        assert response.status_code == 200
        item = response.json()[0]
        for field in ["id", "email", "first_name", "last_name"]:
            assert field in item

    def test_d05_03_user_status_fields(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get("/api/v1/admin/users/")
        assert response.status_code == 200
        item = response.json()[0]
        for field in ["is_active", "is_email_verified"]:
            assert field in item

    def test_d05_04_platform_flags_fields(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get("/api/v1/admin/users/")
        assert response.status_code == 200
        item = response.json()[0]
        for field in ["is_staff", "is_superuser", "created_at"]:
            assert field in item

    def test_d05_05_user_business_membership_aggregation(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(f"/api/v1/admin/users/{self.admin_user.id}/")
        assert response.status_code == 200
        detail = response.json()
        assert "accessible_businesses" in detail
        assert "memberships" in detail
        assert any(m["business_id"] == str(self.business.id) for m in detail["memberships"])

    def test_d05_06_employee_info_relationship(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(f"/api/v1/admin/users/{self.admin_user.id}/")
        assert response.status_code == 200
        assert "employee_info" in response.json()

    def test_d05_07_user_list_viewed_audit(self):
        AuditLog.objects.all().delete()
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get("/api/v1/admin/users/")
        assert response.status_code == 200
        assert AuditLog.objects.filter(actor=self.superuser, action="USER_LIST_VIEWED").exists()

    def test_d05_08_user_detail_200(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(f"/api/v1/admin/users/{self.admin_user.id}/")
        assert response.status_code == 200
        assert response.json()["id"] == str(self.admin_user.id)

    def test_d05_09_detail_identity_fields(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(f"/api/v1/admin/users/{self.admin_user.id}/")
        assert response.status_code == 200
        item = response.json()
        for field in ["id", "email", "first_name", "last_name"]:
            assert field in item

    def test_d05_10_detail_status_platform_fields(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(f"/api/v1/admin/users/{self.admin_user.id}/")
        assert response.status_code == 200
        item = response.json()
        for field in ["is_active", "is_staff", "is_superuser", "is_email_verified", "created_at"]:
            assert field in item

    def test_d05_11_detail_memberships_businesses(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(f"/api/v1/admin/users/{self.admin_user.id}/")
        assert response.status_code == 200
        detail = response.json()
        assert "accessible_businesses" in detail
        assert "memberships" in detail
        assert len(detail["memberships"]) >= 1

    def test_d05_12_user_detail_viewed_audit(self):
        AuditLog.objects.all().delete()
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(f"/api/v1/admin/users/{self.admin_user.id}/")
        assert response.status_code == 200
        assert AuditLog.objects.filter(actor=self.superuser, action="USER_DETAIL_VIEWED").exists()

    def test_d05_13_nonexistent_user_404(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(f"/api/v1/admin/users/{uuid.uuid4()}/")
        assert response.status_code == 404

    def test_d05_14_anonymous_401(self):
        response = self.client.get("/api/v1/admin/users/")
        assert response.status_code in [401, 403]

    def test_d05_15_owner_403(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get("/api/v1/admin/users/")
        assert response.status_code == 403

    def test_d05_16_admin_403(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/admin/users/")
        assert response.status_code == 403

    def test_d05_17_kasir_403(self):
        self.client.force_authenticate(user=self.cashier)
        response = self.client.get("/api/v1/admin/users/")
        assert response.status_code == 403

    def test_d05_18_non_superuser_staff_403(self):
        self.client.force_authenticate(user=self.staff_non_super)
        response = self.client.get("/api/v1/admin/users/")
        assert response.status_code == 403

    def test_d05_19_list_mutation_rejected(self):
        self.client.force_authenticate(user=self.superuser)
        for method in [self.client.post, self.client.put, self.client.patch, self.client.delete]:
            resp = method("/api/v1/admin/users/", {"email": "hack@kopera.io"})
            assert resp.status_code in [405, 403, 404]

    def test_d05_20_detail_mutation_rejected(self):
        self.client.force_authenticate(user=self.superuser)
        for method in [self.client.put, self.client.patch, self.client.delete]:
            resp = method(f"/api/v1/admin/users/{self.admin_user.id}/", {"email": "hack@kopera.io"})
            assert resp.status_code in [405, 403, 404]
