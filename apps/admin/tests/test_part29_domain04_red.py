import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.business.models import Business, Subscription
from apps.audit.models import AuditLog

User = get_user_model()


@pytest.mark.django_db
class TestDomain04BusinessManagementRed:
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
        self.subscription = Subscription.objects.create(
            business=self.business,
            status=Subscription.Status.ACTIVE,
        )

    def test_d04_01_business_list_200(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get("/api/v1/admin/businesses/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_d04_02_required_business_fields(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get("/api/v1/admin/businesses/")
        assert response.status_code == 200
        item = response.json()[0]
        for field in ["id", "name", "status", "owner_id", "subscription_status"]:
            assert field in item

    def test_d04_03_business_status(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(f"/api/v1/admin/businesses/{self.business.id}/")
        assert response.status_code == 200
        assert response.json()["status"] == "ACTIVE"

    def test_d04_04_owner_relationship(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(f"/api/v1/admin/businesses/{self.business.id}/")
        assert response.status_code == 200
        assert response.json()["owner_id"] == str(self.owner.id)

    def test_d04_05_subscription_status(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(f"/api/v1/admin/businesses/{self.business.id}/")
        assert response.status_code == 200
        assert response.json()["subscription_status"] == "ACTIVE"

    def test_d04_06_business_list_viewed_audit(self):
        AuditLog.objects.all().delete()
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get("/api/v1/admin/businesses/")
        assert response.status_code == 200
        assert AuditLog.objects.filter(actor=self.superuser, action="BUSINESS_LIST_VIEWED").exists()

    def test_d04_07_business_detail_200(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(f"/api/v1/admin/businesses/{self.business.id}/")
        assert response.status_code == 200
        assert response.json()["id"] == str(self.business.id)

    def test_d04_08_detail_required_fields(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(f"/api/v1/admin/businesses/{self.business.id}/")
        assert response.status_code == 200
        item = response.json()
        for field in ["id", "name", "status", "owner_id", "subscription_status"]:
            assert field in item

    def test_d04_09_business_detail_viewed_audit(self):
        AuditLog.objects.all().delete()
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(f"/api/v1/admin/businesses/{self.business.id}/")
        assert response.status_code == 200
        assert AuditLog.objects.filter(actor=self.superuser, action="BUSINESS_DETAIL_VIEWED").exists()

    def test_d04_10_nonexistent_business_404(self):
        import uuid
        self.client.force_authenticate(user=self.superuser)
        random_id = uuid.uuid4()
        response = self.client.get(f"/api/v1/admin/businesses/{random_id}/")
        assert response.status_code == 404

    def test_d04_11_anonymous_401(self):
        response = self.client.get("/api/v1/admin/businesses/")
        assert response.status_code in [401, 403]

    def test_d04_12_owner_403(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get("/api/v1/admin/businesses/")
        assert response.status_code == 403

    def test_d04_13_admin_403(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/admin/businesses/")
        assert response.status_code == 403

    def test_d04_14_kasir_403(self):
        self.client.force_authenticate(user=self.cashier)
        response = self.client.get("/api/v1/admin/businesses/")
        assert response.status_code == 403

    def test_d04_15_non_superuser_staff_403(self):
        self.client.force_authenticate(user=self.staff_non_super)
        response = self.client.get("/api/v1/admin/businesses/")
        assert response.status_code == 403

    def test_d04_16_list_mutations_rejected(self):
        self.client.force_authenticate(user=self.superuser)
        for method in [self.client.post, self.client.put, self.client.patch, self.client.delete]:
            resp = method("/api/v1/admin/businesses/", {"name": "Hack"})
            assert resp.status_code in [405, 403, 404]

    def test_d04_17_detail_mutations_rejected(self):
        self.client.force_authenticate(user=self.superuser)
        for method in [self.client.put, self.client.patch, self.client.delete]:
            resp = method(f"/api/v1/admin/businesses/{self.business.id}/", {"name": "Hack"})
            assert resp.status_code in [405, 403, 404]
