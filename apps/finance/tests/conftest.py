import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="finance_owner@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="finance_other@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def auth_tokens(user):
    return {"access": str(RefreshToken.for_user(user).access_token)}


@pytest.fixture
def other_tokens(other_user):
    return {"access": str(RefreshToken.for_user(other_user).access_token)}


@pytest.fixture
def auth_client(client, auth_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {auth_tokens['access']}"
    return client


@pytest.fixture
def other_auth_client(other_tokens):
    from django.test import Client

    c = Client()
    c.defaults["HTTP_AUTHORIZATION"] = f"Bearer {other_tokens['access']}"
    return c


@pytest.fixture
def business(db, user):
    return Business.objects.create(name="Toko Finance", owner=user)


@pytest.fixture
def other_business(db, other_user):
    return Business.objects.create(name="Toko Lain Finance", owner=other_user)
