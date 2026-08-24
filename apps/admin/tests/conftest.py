import pytest

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business


def _make_tokens(user):
    return {"access": str(RefreshToken.for_user(user).access_token)}


def client_for(token):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return c


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def plain_user(db):
    U = get_user_model()
    return U.objects.create_user(
        email="part25_plain@example.com", password="SecurePass123!"
    )


@pytest.fixture
def staff_admin(db):
    # Represents the "ADMIN" principal: authenticated, staff, NOT superuser.
    U = get_user_model()
    return U.objects.create_user(
        email="part25_admin@example.com",
        password="SecurePass123!",
        is_staff=True,
    )


@pytest.fixture
def owner1(db):
    # Represents the "OWNER" principal: owns a Business, NOT superuser.
    U = get_user_model()
    return U.objects.create_user(
        email="part25_owner1@example.com", password="SecurePass123!"
    )


@pytest.fixture
def owner2(db):
    U = get_user_model()
    return U.objects.create_user(
        email="part25_owner2@example.com", password="SecurePass123!"
    )


@pytest.fixture
def superuser(db):
    # The only principal entitled to PART 25 access.
    U = get_user_model()
    return U.objects.create_user(
        email="part25_super@example.com",
        password="SecurePass123!",
        is_superuser=True,
        is_staff=True,
    )


@pytest.fixture
def business1(db, owner1):
    return Business.objects.create(name="Admin Biz Satu", owner=owner1)


@pytest.fixture
def business2(db, owner2):
    return Business.objects.create(name="Admin Biz Dua", owner=owner2)


@pytest.fixture
def plain_tokens(plain_user):
    return _make_tokens(plain_user)


@pytest.fixture
def staff_tokens(staff_admin):
    return _make_tokens(staff_admin)


@pytest.fixture
def owner1_tokens(owner1):
    return _make_tokens(owner1)


@pytest.fixture
def owner2_tokens(owner2):
    return _make_tokens(owner2)


@pytest.fixture
def super_tokens(superuser):
    return _make_tokens(superuser)
