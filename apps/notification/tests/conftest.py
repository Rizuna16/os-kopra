import pytest

from django.contrib.auth import get_user_model

from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, BusinessMembership


User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="notification_owner@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="notification_other@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def member_user(db):
    return User.objects.create_user(
        email="notification_member@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def auth_tokens(user):
    return {"access": str(RefreshToken.for_user(user).access_token)}


@pytest.fixture
def other_tokens(other_user):
    return {"access": str(RefreshToken.for_user(other_user).access_token)}


@pytest.fixture
def member_tokens(member_user):
    return {"access": str(RefreshToken.for_user(member_user).access_token)}


@pytest.fixture
def auth_client(client, auth_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {auth_tokens['access']}"
    return client


@pytest.fixture
def other_auth_client(client, other_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {other_tokens['access']}"
    return client


@pytest.fixture
def member_auth_client(client, member_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {member_tokens['access']}"
    return client


@pytest.fixture
def business(db, user):
    return Business.objects.create(name="Toko Notification", owner=user)


@pytest.fixture
def other_business(db, other_user):
    return Business.objects.create(name="Toko Lain Notification", owner=other_user)


@pytest.fixture
def member_business(db, member_user):
    return Business.objects.create(name="Toko Member Notification", owner=member_user)
