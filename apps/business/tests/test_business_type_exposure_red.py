import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.business.models import Business, BusinessMembership, Subscription
from apps.business.services import ONBOARDING_TEMPLATES

User = get_user_model()

@pytest.mark.django_db
class TestBusinessTypeExposureRed:
    EXPECTED_TEMPLATES = [
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

    def test_owner_can_create_business_with_valid_business_type(self):
        owner = User.objects.create_user(email="exp_owner1@example.com", password="password123")
        client = APIClient()
        client.force_authenticate(user=owner)

        response = client.post("/api/v1/businesses/", {"name": "Toko Maju", "business_type": "Fashion"})
        assert response.status_code == 201
        business_id = response.data["id"]
        biz = Business.objects.get(id=business_id)
        assert biz.business_type == "Fashion"

    def test_all_12_canonical_business_types_are_accepted(self):
        owner = User.objects.create_user(email="exp_owner2@example.com", password="password123")
        client = APIClient()
        client.force_authenticate(user=owner)

        for btype in self.EXPECTED_TEMPLATES:
            response = client.post("/api/v1/businesses/", {"name": f"Toko {btype}", "business_type": btype})
            assert response.status_code == 201
            biz = Business.objects.get(id=response.data["id"])
            assert biz.business_type == btype

    def test_missing_business_type_is_rejected(self):
        owner = User.objects.create_user(email="exp_owner3@example.com", password="password123")
        client = APIClient()
        client.force_authenticate(user=owner)

        response = client.post("/api/v1/businesses/", {"name": "Toko Tanpa Tipe"})
        assert response.status_code == 400

    def test_empty_business_type_is_rejected(self):
        owner = User.objects.create_user(email="exp_owner4@example.com", password="password123")
        client = APIClient()
        client.force_authenticate(user=owner)

        response = client.post("/api/v1/businesses/", {"name": "Toko Kosong", "business_type": ""})
        assert response.status_code == 400

    def test_whitespace_business_type_is_rejected(self):
        owner = User.objects.create_user(email="exp_owner5@example.com", password="password123")
        client = APIClient()
        client.force_authenticate(user=owner)

        response = client.post("/api/v1/businesses/", {"name": "Toko Spasi", "business_type": "   "})
        assert response.status_code == 400

    def test_invalid_business_type_is_rejected(self):
        owner = User.objects.create_user(email="exp_owner6@example.com", password="password123")
        client = APIClient()
        client.force_authenticate(user=owner)

        response = client.post("/api/v1/businesses/", {"name": "Toko Invalid", "business_type": "InvalidType"})
        assert response.status_code == 400

    def test_business_type_is_case_sensitive(self):
        owner = User.objects.create_user(email="exp_owner7@example.com", password="password123")
        client = APIClient()
        client.force_authenticate(user=owner)

        response = client.post("/api/v1/businesses/", {"name": "Toko Case", "business_type": "fashion"})
        assert response.status_code == 400

    def test_owner_membership_preserved(self):
        owner = User.objects.create_user(email="exp_owner8@example.com", password="password123")
        client = APIClient()
        client.force_authenticate(user=owner)

        response = client.post("/api/v1/businesses/", {"name": "Toko Member", "business_type": "Fashion"})
        assert response.status_code == 201
        biz = Business.objects.get(id=response.data["id"])
        membership = BusinessMembership.objects.get(business=biz, user=owner)
        assert membership.role == BusinessMembership.Role.OWNER

    def test_subscription_trial_preserved(self):
        owner = User.objects.create_user(email="exp_owner9@example.com", password="password123")
        client = APIClient()
        client.force_authenticate(user=owner)

        response = client.post("/api/v1/businesses/", {"name": "Toko Sub", "business_type": "Fashion"})
        assert response.status_code == 201
        biz = Business.objects.get(id=response.data["id"])
        sub = Subscription.objects.get(business=biz)
        assert sub.status == Subscription.Status.TRIAL

    def test_is_superuser_unchanged(self):
        owner = User.objects.create_user(email="exp_owner10@example.com", password="password123")
        client = APIClient()
        client.force_authenticate(user=owner)

        response = client.post("/api/v1/businesses/", {"name": "Toko Super", "business_type": "Fashion"})
        assert response.status_code == 201
        owner.refresh_from_db()
        assert not owner.is_superuser

    def test_unauthenticated_creation_rejected(self):
        client = APIClient()
        response = client.post("/api/v1/businesses/", {"name": "Toko Anon", "business_type": "Fashion"})
        assert response.status_code == 401

    def test_feature_matrix_matches_selected_business_type(self):
        owner = User.objects.create_user(email="exp_owner11@example.com", password="password123")
        client = APIClient()
        client.force_authenticate(user=owner)

        response = client.post("/api/v1/businesses/", {"name": "Toko Matrix", "business_type": "Fashion"})
        assert response.status_code == 201
        biz_id = response.data["id"]

        res_feat = client.get(f"/api/v1/businesses/{biz_id}/features/")
        assert res_feat.status_code == 200
        data = res_feat.json()
        assert data["business_type"] == "Fashion"
        assert data["capabilities"]["variants"] is True
