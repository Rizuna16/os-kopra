"""PART 20 — Plan behavior RED suite (behavior 5 of locked contract).

Covers ONLY the Plan listing behavior explicitly supported by the current
PART 20 contract:

  GET /api/v1/billing/plans/  ->  active Plans, owner/tenant-agnostic (catalog),
                                  requires authentication, excludes inactive Plans.

SUSPENDED/CANCELED subscription-lifecycle states and the Midtrans webhook
(PART 21) are out of scope here and remain untouched.
"""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.billing.models import Plan

User = get_user_model()


@pytest.fixture
def auth_client(client, user):
    refresh = RefreshToken.for_user(user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {str(refresh.access_token)}"
    return client


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="planowner@example.com", password="SecurePass123!"
    )


@pytest.fixture
def basic_plan(db):
    return Plan.objects.get(code="basic")


@pytest.fixture
def inactive_plan(db):
    return Plan.objects.create(
        name="Inactive",
        code="inactive",
        amount=Decimal("10000.00"),
        currency="IDR",
        billing_interval="MONTHLY",
        is_active=False,
    )


PLANS_URL = "/api/v1/billing/plans/"


@pytest.mark.django_db
class TestPlanListContract:
    def test_authenticated_lists_active_plan(self, auth_client, basic_plan):
        response = auth_client.get(PLANS_URL)
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]["code"] == "basic"

    def test_inactive_plan_excluded(self, auth_client, basic_plan, inactive_plan):
        response = auth_client.get(PLANS_URL)
        assert response.status_code == 200
        codes = {p["code"] for p in response.data}
        assert "basic" in codes
        assert "inactive" not in codes

    def test_plan_exposes_locked_fields(self, auth_client, basic_plan):
        response = auth_client.get(PLANS_URL)
        assert response.status_code == 200
        plan = response.data[0]
        assert set(plan.keys()) == {
            "id",
            "name",
            "code",
            "amount",
            "currency",
            "billing_interval",
        }

    def test_basic_plan_amount(self, auth_client, basic_plan):
        response = auth_client.get(PLANS_URL)
        assert Decimal(response.data[0]["amount"]) == Decimal("99000.00")

    def test_basic_plan_currency(self, auth_client, basic_plan):
        response = auth_client.get(PLANS_URL)
        assert response.data[0]["currency"] == "IDR"

    def test_basic_plan_billing_interval(self, auth_client, basic_plan):
        response = auth_client.get(PLANS_URL)
        assert response.data[0]["billing_interval"] == "MONTHLY"

    def test_unauthenticated_rejected(self, client):
        response = client.get(PLANS_URL)
        assert response.status_code == 401
