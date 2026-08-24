import pytest

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.business.models import Business
from rest_framework_simplejwt.tokens import RefreshToken

# --------------------------------------------------------------------------
# RED precondition probe (mirrors PART 22 ``require_part22`` pattern).
# Contract V1 requires a PART 24 AI production surface + server-side OpenAI
# integration, but does NOT mandate internal module/file names. We probe the
# conventional Django view location. The probe failing is the GENUINE RED
# signal: the contracted behavior does not exist yet. No fake implementation.
# --------------------------------------------------------------------------
try:
    import apps.ai.views  # conventional PART 24 production surface

    PART24_SURFACE = True
except Exception:
    PART24_SURFACE = False


@pytest.fixture
def require_part24():
    if not PART24_SURFACE:
        pytest.fail(
            "RED TEST DESIGN READY — BLOCKED BY ABSENT PRODUCTION SURFACE: "
            "PART 24 AI question surface / OpenAI server-side integration "
            "not implemented (Contract V1 G1-G4)."
        )


@pytest.fixture
def user(db):
    User = get_user_model()
    return User.objects.create_user(
        email="ai_owner@example.com", password="SecurePass123!"
    )


@pytest.fixture
def business(db, user):
    return Business.objects.create(name="Toko AI Budi", owner=user)


@pytest.fixture
def other_user(db):
    User = get_user_model()
    return User.objects.create_user(
        email="ai_other@example.com", password="SecurePass123!"
    )


@pytest.fixture
def other_biz(db, other_user):
    from apps.product.models import Product

    b = Business.objects.create(name="BISNIS LAIN", owner=other_user)
    Product.objects.create(business=b, name="PRODUCT_LAIN", price="10000")
    return b


@pytest.fixture
def auth_tokens(user):
    return {"access": str(RefreshToken.for_user(user).access_token)}


@pytest.fixture
def auth_client(auth_tokens):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {auth_tokens['access']}")
    return client


@pytest.fixture
def api_client():
    return APIClient()