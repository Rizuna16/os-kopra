import pytest
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.models import User
from apps.business.models import Business, Subscription
from apps.billing.models import Plan, Payment
from apps.audit.models import AuditLog
from apps.admin.models import Module, Feature, PlanFeature, BusinessFeatureOverride
from apps.admin.services import is_feature_enabled


@pytest.fixture
def superadmin():
    return User.objects.create_superuser(
        email="superadmin10@kopera.io",
        password="password123",
        first_name="Super",
        last_name="Admin",
    )


@pytest.fixture
def normal_user():
    return User.objects.create_user(
        email="user10@kopera.io",
        password="password123",
        first_name="Normal",
        last_name="User",
    )


@pytest.fixture
def staff_user():
    return User.objects.create_user(
        email="staff10@kopera.io",
        password="password123",
        is_staff=True,
        is_superuser=False,
    )


@pytest.fixture
def sample_setup(superadmin):
    module = Module.objects.create(
        code="INVENTORY",
        name="Inventory Module",
        description="Inventory management",
        is_active=True,
    )
    feature = Feature.objects.create(
        module=module,
        code="INVENTORY_STOCK",
        name="Stock Management",
        description="Manage stock levels",
        is_active=True,
        is_beta=False,
    )
    plan = Plan.objects.create(
        name="Enterprise Plan",
        code="ENT-10",
        amount=500000.00,
        currency="IDR",
        billing_interval="MONTHLY",
        is_active=True,
    )
    PlanFeature.objects.create(
        plan=plan,
        feature=feature,
        is_enabled=True,
    )
    business = Business.objects.create(
        name="Toko Makmur 10",
        owner=superadmin,
        status="ACTIVE",
    )
    subscription = Subscription.objects.create(
        business=business,
        status="ACTIVE",
    )
    Payment.objects.create(
        subscription=subscription,
        plan=plan,
        amount=plan.amount,
        currency=plan.currency,
        status=Payment.Status.PAID,
        provider="MIDTRANS",
        provider_reference="snap-10",
    )
    return {
        "module": module,
        "feature": feature,
        "plan": plan,
        "business": business,
        "subscription": subscription,
    }


@pytest.mark.django_db
class TestDomain10Green:
    def test_d10_01_models_exist(self):
        assert Module.objects.count() >= 0
        assert Feature.objects.count() >= 0
        assert PlanFeature.objects.count() >= 0
        assert BusinessFeatureOverride.objects.count() >= 0

    def test_d10_02_module_crud_api(self, superadmin):
        client = APIClient()
        client.force_authenticate(user=superadmin)

        # Create
        res = client.post("/api/v1/admin/modules/", {"code": "SALES", "name": "Sales Module"})
        assert res.status_code == status.HTTP_201_CREATED
        data = res.json()
        mod_id = data["id"]

        # List
        res = client.get("/api/v1/admin/modules/")
        assert res.status_code == status.HTTP_200_OK

        # Detail
        res = client.get(f"/api/v1/admin/modules/{mod_id}/")
        assert res.status_code == status.HTTP_200_OK

        # Patch
        res = client.patch(f"/api/v1/admin/modules/{mod_id}/", {"name": "Updated Sales"})
        assert res.status_code == status.HTTP_200_OK

        # Disable & Enable
        res = client.post(f"/api/v1/admin/modules/{mod_id}/disable/")
        assert res.status_code == status.HTTP_200_OK
        res = client.post(f"/api/v1/admin/modules/{mod_id}/enable/")
        assert res.status_code == status.HTTP_200_OK

    def test_d10_03_feature_crud_api(self, superadmin):
        client = APIClient()
        client.force_authenticate(user=superadmin)

        mod = Module.objects.create(code="FINANCE", name="Finance")
        res = client.post("/api/v1/admin/features/", {
            "module": str(mod.id),
            "code": "FIN_REPORT",
            "name": "Financial Report",
        })
        assert res.status_code == status.HTTP_201_CREATED
        feat_id = res.json()["id"]

        res = client.get("/api/v1/admin/features/")
        assert res.status_code == status.HTTP_200_OK

        res = client.get(f"/api/v1/admin/features/{feat_id}/")
        assert res.status_code == status.HTTP_200_OK

        res = client.patch(f"/api/v1/admin/features/{feat_id}/", {"name": "New Name"})
        assert res.status_code == status.HTTP_200_OK

        res = client.post(f"/api/v1/admin/features/{feat_id}/disable/")
        assert res.status_code == status.HTTP_200_OK
        res = client.post(f"/api/v1/admin/features/{feat_id}/enable/")
        assert res.status_code == status.HTTP_200_OK

    def test_d10_04_plan_feature_api(self, superadmin, sample_setup):
        client = APIClient()
        client.force_authenticate(user=superadmin)

        plan = sample_setup["plan"]
        feat = sample_setup["feature"]

        res = client.get(f"/api/v1/admin/plans/{plan.id}/features/")
        assert res.status_code == status.HTTP_200_OK

        # Delete existing PlanFeature and recreate
        PlanFeature.objects.filter(plan=plan, feature=feat).delete()

        res = client.post(f"/api/v1/admin/plans/{plan.id}/features/", {
            "feature": str(feat.id),
            "is_enabled": True,
        })
        assert res.status_code == status.HTTP_201_CREATED

        res = client.delete(f"/api/v1/admin/plans/{plan.id}/features/{feat.id}/")
        assert res.status_code == status.HTTP_204_NO_CONTENT

    def test_d10_05_business_override_api(self, superadmin, sample_setup):
        client = APIClient()
        client.force_authenticate(user=superadmin)

        business = sample_setup["business"]
        feat = sample_setup["feature"]

        res = client.get(f"/api/v1/admin/businesses/{business.id}/features/")
        assert res.status_code == status.HTTP_200_OK

        res = client.patch(f"/api/v1/admin/businesses/{business.id}/features/{feat.id}/", {
            "state": "ENABLED",
        })
        assert res.status_code == status.HTTP_200_OK
        assert res.json()["state"] == "ENABLED"

    def test_d10_06_authorization_boundaries(self, normal_user, staff_user):
        client = APIClient()

        # Anonymous -> 401
        res = client.get("/api/v1/admin/modules/")
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

        # Normal User -> 403
        client.force_authenticate(user=normal_user)
        res = client.get("/api/v1/admin/modules/")
        assert res.status_code == status.HTTP_403_FORBIDDEN

        # Staff User -> 403
        client.force_authenticate(user=staff_user)
        res = client.get("/api/v1/admin/modules/")
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_d10_07_entitlement_precedence(self, sample_setup):
        business = sample_setup["business"]
        feat = sample_setup["feature"]
        mod = sample_setup["module"]

        # Default: enabled (plan has it enabled)
        assert is_feature_enabled(business, feat.code) is True

        # 1. Feature inactive -> False
        feat.is_active = False
        feat.save()
        assert is_feature_enabled(business, feat.code) is False
        feat.is_active = True
        feat.save()

        # 2. Module inactive -> False
        mod.is_active = False
        mod.save()
        assert is_feature_enabled(business, feat.code) is False
        mod.is_active = True
        mod.save()

        # 3. Business Override DISABLED -> False
        BusinessFeatureOverride.objects.update_or_create(
            business=business,
            feature=feat,
            defaults={"state": "DISABLED"},
        )
        assert is_feature_enabled(business, feat.code) is False

        # Business Override ENABLED -> True
        BusinessFeatureOverride.objects.update_or_create(
            business=business,
            feature=feat,
            defaults={"state": "ENABLED"},
        )
        assert is_feature_enabled(business, feat.code) is True

    def test_d10_08_audit_logging(self, superadmin):
        client = APIClient()
        client.force_authenticate(user=superadmin)

        client.get("/api/v1/admin/modules/")
        assert AuditLog.objects.filter(actor=superadmin, action="MODULE_LIST_VIEWED").exists()
