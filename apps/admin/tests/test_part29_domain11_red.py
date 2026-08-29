import pytest
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.models import User
from apps.admin.models import Module, Feature

@pytest.fixture
def superadmin():
    return User.objects.create_superuser(
        email="superadmin11@kopera.io",
        password="password123",
        first_name="Super",
        last_name="Admin",
    )

@pytest.fixture
def normal_user():
    return User.objects.create_user(
        email="user11@kopera.io",
        password="password123",
        first_name="Normal",
        last_name="User",
    )

@pytest.fixture
def sample_feature(superadmin):
    module = Module.objects.create(
        code="CORE",
        name="Core Module",
        is_active=True,
    )
    return Feature.objects.create(
        module=module,
        code="GLOBAL_FEATURE",
        name="Global Feature",
        is_active=True,
    )

@pytest.mark.django_db
class TestDomain11PlatformFeatureToggles:
    def test_d11_01_list_features_superadmin(self, superadmin, sample_feature):
        client = APIClient()
        client.force_authenticate(user=superadmin)
        res = client.get("/api/v1/admin/platform/features/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert any(f["code"] == "GLOBAL_FEATURE" for f in data)

    def test_d11_02_feature_detail_superadmin(self, superadmin, sample_feature):
        client = APIClient()
        client.force_authenticate(user=superadmin)
        res = client.get(f"/api/v1/admin/platform/features/{sample_feature.id}/")
        assert res.status_code == status.HTTP_200_OK
        assert res.json()["code"] == "GLOBAL_FEATURE"

    def test_d11_03_enable_disable_feature(self, superadmin, sample_feature):
        client = APIClient()
        client.force_authenticate(user=superadmin)
        
        # Disable
        res = client.post(f"/api/v1/admin/platform/features/{sample_feature.id}/disable/")
        assert res.status_code == status.HTTP_200_OK
        sample_feature.refresh_from_db()
        assert sample_feature.is_active is False

        # Enable
        res = client.post(f"/api/v1/admin/platform/features/{sample_feature.id}/enable/")
        assert res.status_code == status.HTTP_200_OK
        sample_feature.refresh_from_db()
        assert sample_feature.is_active is True

    def test_d11_04_authorization_unauthenticated(self, sample_feature):
        client = APIClient()
        res = client.get("/api/v1/admin/platform/features/")
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_d11_05_authorization_non_superadmin(self, normal_user, sample_feature):
        client = APIClient()
        client.force_authenticate(user=normal_user)
        res = client.get("/api/v1/admin/platform/features/")
        assert res.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]

    def test_d11_06_platform_boundary_no_tenant_scope(self, superadmin, sample_feature):
        client = APIClient()
        client.force_authenticate(user=superadmin)
        # Verify endpoint does not accept business_id or tenant context to modify global feature toggles
        res = client.post(f"/api/v1/admin/platform/features/{sample_feature.id}/disable/", {"business_id": "9999"})
        # Should still toggle global or ignore tenant parameter without failing platform scope
        assert res.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_d11_07_invalid_feature_id(self, superadmin):
        client = APIClient()
        client.force_authenticate(user=superadmin)
        res = client.get("/api/v1/admin/platform/features/999999/")
        assert res.status_code == status.HTTP_404_NOT_FOUND
