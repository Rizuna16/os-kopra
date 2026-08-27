import pytest
import inspect
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, BusinessMembership
from apps.authentication.permissions import ROLE_PERMISSIONS
from apps.ai import services

User = get_user_model()


@pytest.fixture
def lock7_users(db):
    owner = User.objects.create_user(email="owner_l7@example.com", password="SecurePass123!")
    admin = User.objects.create_user(email="admin_l7@example.com", password="SecurePass123!")
    kasir = User.objects.create_user(email="kasir_l7@example.com", password="SecurePass123!")
    superuser = User.objects.create_superuser(email="super_l7@example.com", password="SecurePass123!")
    return {
        "owner": owner,
        "admin": admin,
        "kasir": kasir,
        "superuser": superuser,
    }


@pytest.fixture
def lock7_business(db, lock7_users):
    b = Business.objects.create(name="Business Lock 7", owner=lock7_users["owner"])
    BusinessMembership.objects.create(business=b, user=lock7_users["admin"], role="ADMIN")
    BusinessMembership.objects.create(business=b, user=lock7_users["kasir"], role="KASIR")
    return b


def get_client(client, user):
    client.logout()
    if "HTTP_AUTHORIZATION" in client.defaults:
        del client.defaults["HTTP_AUTHORIZATION"]
    refresh = RefreshToken.for_user(user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(refresh.access_token)}"
    return client


@pytest.mark.django_db
class TestContractLock7AIRed:
    # 1. Exact behavior gather_facts() per role
    def test_ai_gather_facts_owner_only(self, lock7_users, lock7_business):
        # OWNER can see facts
        owner_facts = services.gather_facts(lock7_users["owner"])
        # Should contain revenue (starts as 0, but valid dict keys)
        assert "revenue_this_month" in owner_facts

        # ADMIN has no AI access (should return 0 revenue or empty facts)
        admin_facts = services.gather_facts(lock7_users["admin"])
        assert admin_facts["revenue_this_month"] == "0"
        assert len(admin_facts["best_selling"]) == 0

        # KASIR has no AI access
        kasir_facts = services.gather_facts(lock7_users["kasir"])
        assert kasir_facts["revenue_this_month"] == "0"

        # Non-owning Superuser has no AI access (cannot bypass owner constraint for AI insights)
        super_facts = services.gather_facts(lock7_users["superuser"])
        assert super_facts["revenue_this_month"] == "0"

    # 2. Static source assertion: no inline owner filter
    def test_ai_no_inline_owner_filter(self):
        source = inspect.getsource(services)
        assert "Business.objects.filter(owner=" not in source, (
            "AI services must not use raw inline owner filtering for Business visibility"
        )
        assert "business__owner=" not in source, (
            "AI services must not use raw inline owner filter queries"
        )
        assert "business__owner = " not in source, (
            "AI services must not use raw inline owner filter queries"
        )

    # 3. Static source assertion: gather_facts() references filter_visible_businesses()
    def test_ai_requires_canonical_visibility(self):
        source = inspect.getsource(services.gather_facts)
        assert "filter_visible_businesses" in source, (
            "gather_facts must use filter_visible_businesses for canonical visibility resolution"
        )

    # 4. Ensure AI does NOT introduce an ai entry into ROLE_PERMISSIONS
    def test_ai_no_role_permissions_pollution(self):
        for key in ROLE_PERMISSIONS.keys():
            # Domain key is at index 1 of the tuple: (role, domain, action)
            assert key[1] != "ai", "AI consolidation must not pollutes the central ROLE_PERMISSIONS matrix with new keys"
