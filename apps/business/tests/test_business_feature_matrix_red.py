import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.business.models import Business, BusinessMembership

User = get_user_model()

@pytest.mark.django_db
class TestBusinessFeatureMatrixRed:
    EXPECTED_TYPES = [
        "Bangunan & Perkakas",
        "Sembako & Kebutuhan Harian",
        "Fashion",
        "Makanan & Minuman",
        "Elektronik & Komputer",
        "Kecantikan & Perawatan",
        "Kesehatan & Apotek",
        "Rumah Tangga & Furniture",
        "Otomotif & Sparepart",
        "Buku & Alat Tulis",
        "Grosir & Distributor",
        "Usaha Lainnya"
    ]

    def test_exact_12_canonical_types_and_matrix_endpoint(self):
        owner = User.objects.create_user(email="matrix_owner@example.com", password="password123")
        client = APIClient()
        client.force_authenticate(user=owner)

        for btype in self.EXPECTED_TYPES:
            biz = Business.objects.create(name=f"Biz {btype}", owner=owner, business_type=btype)
            response = client.get(f"/api/v1/businesses/{biz.id}/features/")
            assert response.status_code == 200
            data = response.json()
            assert data["business_type"] == btype
            assert "capabilities" in data
            
            # Shared core validation
            caps = data["capabilities"]
            assert caps["product_management"] is True
            assert caps["inventory_management"] is True
            assert caps["supplier_management"] is True
            assert caps["purchasing"] is True
            assert caps["sales_pos"] is True
            assert caps["customer_management"] is True
            assert caps["promotion_loyalty"] is True
            assert caps["reporting"] is True
            assert caps["notification"] is True
            assert caps["security_audit"] is True

            # Business-specific capability validation
            if btype in ["Fashion", "Rumah Tangga & Furniture", "Kecantikan & Perawatan"]:
                assert caps["variants"] is True
            else:
                assert caps["variants"] is False

            if btype in ["Elektronik & Komputer", "Kesehatan & Apotek", "Otomotif & Sparepart"]:
                assert caps["serial_tracking"] is True
            else:
                assert caps["serial_tracking"] is False

            if btype in ["Makanan & Minuman", "Kesehatan & Apotek", "Otomotif & Sparepart"]:
                assert caps["batch_expiry_tracking"] is True
            else:
                assert caps["batch_expiry_tracking"] is False

            if btype in ["Fashion", "Kecantikan & Perawatan", "Makanan & Minuman", "Sembako & Kebutuhan Harian"]:
                assert caps["loyalty_programs"] is True
            else:
                assert caps["loyalty_programs"] is False

    def test_unauthenticated_and_cross_business_isolation(self):
        owner_a = User.objects.create_user(email="own_a_mat@example.com", password="password123")
        owner_b = User.objects.create_user(email="own_b_mat@example.com", password="password123")
        biz_a = Business.objects.create(name="Biz A", owner=owner_a, business_type="Fashion")

        client = APIClient()
        # Unauthenticated -> 401
        res_unauth = client.get(f"/api/v1/businesses/{biz_a.id}/features/")
        assert res_unauth.status_code == 401

        # Cross business -> 403 or 404
        client.force_authenticate(user=owner_b)
        res_cross = client.get(f"/api/v1/businesses/{biz_a.id}/features/")
        assert res_cross.status_code in [403, 404]

    def test_immutability_and_state_preservation(self):
        owner = User.objects.create_user(email="immutable_mat@example.com", password="password123")
        biz = Business.objects.create(name="Biz Immut", owner=owner, business_type="Fashion")
        sub = biz.subscriptions.first()
        membership = biz.memberships.first()

        client = APIClient()
        client.force_authenticate(user=owner)

        # GET request
        res = client.get(f"/api/v1/businesses/{biz.id}/features/")
        assert res.status_code == 200

        # Assert no state mutation
        biz.refresh_from_db()
        assert biz.name == "Biz Immut"
        assert biz.business_type == "Fashion"
        assert not owner.is_superuser
        if sub:
            sub.refresh_from_db()
        if membership:
            membership.refresh_from_db()
            assert membership.role == BusinessMembership.Role.OWNER
