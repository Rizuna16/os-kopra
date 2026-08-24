"""PART 20 — Subscription & Billing (v1) RED suite.

Scope locked by "PART 20 LIFECYCLE DECISION FINAL":

  - ONBOARDING = PART 20 creation state
  - ACTIVE     = owned by PART 21 (Midtrans webhook) — NOT PART 20
  - SUSPENDED  = reserved/deferred in PART 20 v1 (no transition mechanism)
  - CANCELED   = reserved/deferred in PART 20 v1 (no transition mechanism)

Therefore this suite covers ONLY:
  1. Subscription creation behavior (POST /api/v1/businesses/<id>/subscription/)
  2. ONBOARDING initial state
  3. Business ownership / isolation
  4. One active/onboarding subscription constraint per business
  5. (Plan behavior is covered in apps/billing/tests/test_part20_plan.py)
  6. Other explicitly locked behavior: PART 20 must NOT expose suspend/cancel
     endpoints and must NOT mutate status to ACTIVE.

SUSPENDED / CANCELED are treated as declared-but-deferred states.
No test here requires a SUSPENDED/CANCELED transition. PART 21 is untouched.
"""

from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, BusinessMembership, Location, Subscription

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="owner20@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="other20@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def auth_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token)}


@pytest.fixture
def other_tokens(other_user):
    refresh = RefreshToken.for_user(other_user)
    return {"access": str(refresh.access_token)}


@pytest.fixture
def auth_client(client, auth_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {auth_tokens['access']}"
    return client


@pytest.fixture
def other_auth_client(client, other_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {other_tokens['access']}"
    return client


@pytest.fixture
def business(db, user):
    return Business.objects.create(name="Toko Budi 20", owner=user)


SUBSCRIPTION_URL = "/api/v1/businesses/{biz}/subscription/"


@pytest.mark.django_db
class TestSubscriptionCreateContract:
    # ---- Behavior 1: Subscription creation -------------------------------
    def test_owner_creates_subscription_201(self, auth_client, business):
        response = auth_client.post(
            SUBSCRIPTION_URL.format(biz=business.id),
            {},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert "id" in response.data

    def test_created_subscription_business_set_server_side(self, auth_client, business):
        response = auth_client.post(
            SUBSCRIPTION_URL.format(biz=business.id),
            {},
            content_type="application/json",
        )
        assert response.status_code == 201
        sub = Subscription.objects.get(id=response.data["id"])
        assert sub.business_id == business.id

    def test_business_field_not_client_writable(self, auth_client, business, other_user):
        other_biz = Business.objects.create(name="Other Biz", owner=other_user)
        response = auth_client.post(
            SUBSCRIPTION_URL.format(biz=business.id),
            {"business": str(other_biz.id)},
            content_type="application/json",
        )
        assert response.status_code == 201
        sub = Subscription.objects.get(id=response.data["id"])
        assert sub.business_id == business.id
        assert sub.business_id != other_biz.id

    def test_creation_has_no_side_effects(self, auth_client, business):
        biz_ct = Business.objects.count()
        loc_ct = Location.objects.count()
        user_ct = User.objects.count()
        auth_client.post(
            SUBSCRIPTION_URL.format(biz=business.id),
            {},
            content_type="application/json",
        )
        assert Business.objects.count() == biz_ct
        assert Location.objects.count() == loc_ct
        assert User.objects.count() == user_ct

    # ---- Behavior 2: ONBOARDING initial state ---------------------------
    def test_created_subscription_is_onboarding(self, auth_client, business):
        response = auth_client.post(
            SUBSCRIPTION_URL.format(biz=business.id),
            {},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["status"] == "ONBOARDING"
        sub = Subscription.objects.get(id=response.data["id"])
        assert sub.status == Subscription.Status.ONBOARDING

    def test_response_exposes_onboarding_only_fields(self, auth_client, business):
        response = auth_client.post(
            SUBSCRIPTION_URL.format(biz=business.id),
            {},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert set(response.data.keys()) == {
            "id",
            "business",
            "status",
            "created_at",
            "updated_at",
        }

    # ---- Behavior 3: Business ownership / isolation ---------------------
    def test_other_owner_cannot_create_404(self, other_auth_client, business):
        response = other_auth_client.post(
            SUBSCRIPTION_URL.format(biz=business.id),
            {},
            content_type="application/json",
        )
        assert response.status_code == 404
        assert Subscription.objects.filter(business=business).count() == 0

    def test_unauthenticated_returns_401(self, client, business):
        response = client.post(
            SUBSCRIPTION_URL.format(biz=business.id),
            {},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_invalid_business_returns_404(self, auth_client):
        response = auth_client.post(
            SUBSCRIPTION_URL.format(biz=uuid4()),
            {},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_member_cannot_create_404(self, other_auth_client, business, other_user):
        BusinessMembership.objects.create(business=business, user=other_user)
        before = Subscription.objects.count()
        response = other_auth_client.post(
            SUBSCRIPTION_URL.format(biz=business.id),
            {},
            content_type="application/json",
        )
        assert response.status_code == 404
        assert Subscription.objects.count() == before

    def test_second_business_gets_independent_subscription(self, auth_client, user):
        biz1 = Business.objects.create(name="Biz One", owner=user)
        biz2 = Business.objects.create(name="Biz Two", owner=user)
        r1 = auth_client.post(
            SUBSCRIPTION_URL.format(biz=biz1.id),
            {},
            content_type="application/json",
        )
        r2 = auth_client.post(
            SUBSCRIPTION_URL.format(biz=biz2.id),
            {},
            content_type="application/json",
        )
        assert r1.status_code == 201
        assert r2.status_code == 201
        assert Subscription.objects.get(id=r1.data["id"]).business_id == biz1.id
        assert Subscription.objects.get(id=r2.data["id"]).business_id == biz2.id

    # ---- Behavior 4: One active/onboarding subscription constraint ------
    def test_duplicate_active_subscription_rejected_400(self, auth_client, business):
        r1 = auth_client.post(
            SUBSCRIPTION_URL.format(biz=business.id),
            {},
            content_type="application/json",
        )
        assert r1.status_code == 201
        r2 = auth_client.post(
            SUBSCRIPTION_URL.format(biz=business.id),
            {},
            content_type="application/json",
        )
        assert r2.status_code == 400
        assert Subscription.objects.filter(business=business).count() == 1

    def test_duplicate_onboarding_then_active_rejected_400(
        self, auth_client, business, other_user
    ):
        r1 = auth_client.post(
            SUBSCRIPTION_URL.format(biz=business.id),
            {},
            content_type="application/json",
        )
        assert r1.status_code == 201
        # Simulate PART 21 activation (NOT a PART 20 endpoint); PART 20 must
        # still block a second subscription for the now-ACTIVE business.
        sub = Subscription.objects.get(id=r1.data["id"])
        sub.status = Subscription.Status.ACTIVE
        sub.save()
        r2 = auth_client.post(
            SUBSCRIPTION_URL.format(biz=business.id),
            {},
            content_type="application/json",
        )
        assert r2.status_code == 400
        assert Subscription.objects.filter(business=business).count() == 1

    # ---- Behavior 6: Locked negative guarantees (no transition machinery)
    def test_no_suspend_endpoint(self, auth_client, business):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/subscription/suspend/",
            {},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_no_cancel_endpoint(self, auth_client, business):
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/subscription/cancel/",
            {},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_creation_never_returns_active(self, auth_client, business):
        response = auth_client.post(
            SUBSCRIPTION_URL.format(biz=business.id),
            {},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["status"] == "ONBOARDING"
