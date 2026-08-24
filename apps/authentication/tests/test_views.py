from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import UserSession

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="test@example.com",
        password="SecurePass123!",
        first_name="Test",
        last_name="User",
    )


@pytest.fixture
def auth_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "jti": refresh["jti"],
    }


@pytest.mark.django_db
class TestRegisterView:
    def test_register_success(self, client):
        response = client.post(
            "/api/v1/auth/register/",
            {
                "email": "newuser@example.com",
                "first_name": "New",
                "last_name": "User",
                "password": "SecurePass123!",
                "password_confirm": "SecurePass123!",
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        assert "message" in response.data
        assert response.data["user"]["email"] == "newuser@example.com"
        assert "password" not in response.data
        assert "password_confirm" not in response.data

    def test_register_lowercase_email(self, client):
        response = client.post(
            "/api/v1/auth/register/",
            {
                "email": "NEWUSER@EXAMPLE.COM",
                "password": "SecurePass123!",
                "password_confirm": "SecurePass123!",
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["user"]["email"] == "newuser@example.com"

    def test_register_duplicate_email(self, client):
        User.objects.create_user(email="dup@example.com", password="pass123")
        response = client.post(
            "/api/v1/auth/register/",
            {
                "email": "dup@example.com",
                "password": "SecurePass123!",
                "password_confirm": "SecurePass123!",
            },
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "already exists" in response.data["errors"]["email"][0].lower()

    def test_register_password_mismatch(self, client):
        response = client.post(
            "/api/v1/auth/register/",
            {
                "email": "newuser@example.com",
                "password": "SecurePass123!",
                "password_confirm": "DifferentPass456!",
            },
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "match" in response.data["errors"]["password_confirm"][0].lower()

    def test_register_weak_password(self, client):
        response = client.post(
            "/api/v1/auth/register/",
            {
                "email": "weak@example.com",
                "password": "123",
                "password_confirm": "123",
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_register_missing_email(self, client):
        response = client.post(
            "/api/v1/auth/register/",
            {
                "password": "SecurePass123!",
                "password_confirm": "SecurePass123!",
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_register_missing_password(self, client):
        response = client.post(
            "/api/v1/auth/register/",
            {
                "email": "nopass@example.com",
            },
            content_type="application/json",
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestLoginView:
    def test_login_success_creates_session(self, client, verified_user):
        response = client.post(
            "/api/v1/auth/login/",
            {"email": "verified@example.com", "password": "SecurePass123!"},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert "access" in response.data
        assert "refresh" in response.data
        assert UserSession.objects.filter(user=verified_user).count() == 1
        session = UserSession.objects.get(user=verified_user)
        refresh = RefreshToken(response.data["refresh"])
        assert session.refresh_token_jti == refresh["jti"]

    def test_login_wrong_password(self, client, verified_user):
        response = client.post(
            "/api/v1/auth/login/",
            {"email": "verified@example.com", "password": "WrongPass123!"},
            content_type="application/json",
        )
        assert response.status_code == 401
        assert "invalid" in response.data["error"].lower()

    def test_login_inactive_user(self, client, verified_user):
        verified_user.is_active = False
        verified_user.save()
        response = client.post(
            "/api/v1/auth/login/",
            {"email": "verified@example.com", "password": "SecurePass123!"},
            content_type="application/json",
        )
        assert response.status_code == 401
        assert "inactive" in response.data["error"].lower()

    def test_login_nonexistent_user(self, client):
        response = client.post(
            "/api/v1/auth/login/",
            {"email": "nouser@example.com", "password": "SecurePass123!"},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_login_missing_fields(self, client):
        response = client.post(
            "/api/v1/auth/login/",
            {"email": "test@example.com"},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_login_stores_session_metadata(self, client, verified_user):
        client.post(
            "/api/v1/auth/login/",
            {"email": "verified@example.com", "password": "SecurePass123!"},
            content_type="application/json",
        )
        session = UserSession.objects.get(user=verified_user)
        assert session.ip_address == "127.0.0.1"
        assert session.expires_at > timezone.now()

    def test_login_unverified_user_rejected(self, client, user):
        response = client.post(
            "/api/v1/auth/login/",
            {"email": "test@example.com", "password": "SecurePass123!"},
            content_type="application/json",
        )
        assert response.status_code == 401
        assert "not verified" in response.data["error"].lower()

    def test_login_verified_user_works(self, client, verified_user):
        response = client.post(
            "/api/v1/auth/login/",
            {"email": "verified@example.com", "password": "SecurePass123!"},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert "access" in response.data
        assert "refresh" in response.data
        assert "user" in response.data
        assert UserSession.objects.filter(user=verified_user).count() == 1

    def test_login_inactive_verified_user_rejected(self, client, verified_user):
        verified_user.is_active = False
        verified_user.save(update_fields=["is_active"])
        response = client.post(
            "/api/v1/auth/login/",
            {"email": "verified@example.com", "password": "SecurePass123!"},
            content_type="application/json",
        )
        assert response.status_code == 401
        assert "inactive" in response.data["error"].lower()


@pytest.mark.django_db
class TestLogoutView:
    def test_logout_revokes_session(self, client, user, auth_tokens):
        session = UserSession.objects.create(
            user=user,
            refresh_token_jti=auth_tokens["jti"],
            device_name="Test Device",
            ip_address="127.0.0.1",
            user_agent="TestAgent",
            expires_at=timezone.now() + timedelta(days=7),
        )
        response = client.post(
            "/api/v1/auth/logout/",
            {"refresh": auth_tokens["refresh"]},
            HTTP_AUTHORIZATION=f"Bearer {auth_tokens['access']}",
            content_type="application/json",
        )
        assert response.status_code == 200
        session.refresh_from_db()
        assert session.revoked_at is not None

    def test_logout_without_refresh_token(self, client, user, auth_tokens):
        UserSession.objects.create(
            user=user,
            refresh_token_jti=auth_tokens["jti"],
            device_name="Test",
            ip_address="127.0.0.1",
            user_agent="Test",
            expires_at=timezone.now() + timedelta(days=7),
        )
        response = client.post(
            "/api/v1/auth/logout/",
            HTTP_AUTHORIZATION=f"Bearer {auth_tokens['access']}",
            content_type="application/json",
        )
        assert response.status_code == 200

    def test_logout_invalid_refresh_token(self, client, user, auth_tokens):
        response = client.post(
            "/api/v1/auth/logout/",
            {"refresh": "invalid-token"},
            HTTP_AUTHORIZATION=f"Bearer {auth_tokens['access']}",
            content_type="application/json",
        )
        assert response.status_code == 200

    def test_logout_requires_auth(self, client):
        response = client.post("/api/v1/auth/logout/", content_type="application/json")
        assert response.status_code == 401


@pytest.mark.django_db
class TestLogoutAllView:
    def test_logout_all_revokes_all_sessions(self, client, user, auth_tokens):
        UserSession.objects.create(
            user=user,
            refresh_token_jti="jti-1",
            device_name="Device 1",
            ip_address="127.0.0.1",
            user_agent="Agent1",
            expires_at=timezone.now() + timedelta(days=7),
        )
        UserSession.objects.create(
            user=user,
            refresh_token_jti="jti-2",
            device_name="Device 2",
            ip_address="127.0.0.1",
            user_agent="Agent2",
            expires_at=timezone.now() + timedelta(days=7),
        )
        response = client.post(
            "/api/v1/auth/logout-all/",
            HTTP_AUTHORIZATION=f"Bearer {auth_tokens['access']}",
            content_type="application/json",
        )
        assert response.status_code == 200
        assert UserSession.objects.filter(user=user, revoked_at__isnull=True).count() == 0
        assert UserSession.objects.filter(user=user, revoked_at__isnull=False).count() == 2

    def test_logout_all_requires_auth(self, client):
        response = client.post("/api/v1/auth/logout-all/", content_type="application/json")
        assert response.status_code == 401


@pytest.mark.django_db
class TestUserProfileView:
    def test_get_profile(self, client, user, auth_tokens):
        response = client.get(
            "/api/v1/auth/me/",
            HTTP_AUTHORIZATION=f"Bearer {auth_tokens['access']}",
        )
        assert response.status_code == 200
        assert response.data["email"] == "test@example.com"
        assert response.data["first_name"] == "Test"
        assert response.data["last_name"] == "User"
        assert "password" not in response.data

    def test_get_profile_requires_auth(self, client):
        response = client.get("/api/v1/auth/me/")
        assert response.status_code == 401

    def test_patch_profile(self, client, user, auth_tokens):
        response = client.patch(
            "/api/v1/auth/me/",
            {"first_name": "Updated", "last_name": "Name"},
            HTTP_AUTHORIZATION=f"Bearer {auth_tokens['access']}",
            content_type="application/json",
        )
        assert response.status_code == 200
        user.refresh_from_db()
        assert user.first_name == "Updated"
        assert user.last_name == "Name"

    def test_patch_profile_invalid_data(self, client, user, auth_tokens):
        response = client.patch(
            "/api/v1/auth/me/",
            {"first_name": "x" * 200},
            HTTP_AUTHORIZATION=f"Bearer {auth_tokens['access']}",
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_email_not_updatable_via_profile(self, client, user, auth_tokens):
        client.patch(
            "/api/v1/auth/me/",
            {"email": "newemail@example.com"},
            HTTP_AUTHORIZATION=f"Bearer {auth_tokens['access']}",
            content_type="application/json",
        )
        user.refresh_from_db()
        assert user.email == "test@example.com"


@pytest.mark.django_db
class TestTokenRefreshView:
    def test_refresh_success(self, client, user, auth_tokens):
        UserSession.objects.create(
            user=user,
            refresh_token_jti=auth_tokens["jti"],
            device_name="Test",
            ip_address="127.0.0.1",
            user_agent="Test",
            expires_at=timezone.now() + timedelta(days=7),
        )
        response = client.post(
            "/api/v1/auth/token/refresh/",
            {"refresh": auth_tokens["refresh"]},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert "access" in response.data
        assert "refresh" in response.data

    def test_refresh_revokes_old_session_and_creates_new(self, client, user, auth_tokens):
        UserSession.objects.create(
            user=user,
            refresh_token_jti=auth_tokens["jti"],
            device_name="Test",
            ip_address="127.0.0.1",
            user_agent="Test",
            expires_at=timezone.now() + timedelta(days=7),
        )
        response = client.post(
            "/api/v1/auth/token/refresh/",
            {"refresh": auth_tokens["refresh"]},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert UserSession.objects.filter(refresh_token_jti=auth_tokens["jti"]).count() == 0
        new_jti = RefreshToken(response.data["refresh"])["jti"]
        assert UserSession.objects.filter(refresh_token_jti=new_jti).exists()

    def test_refresh_revoked_session_rejected(self, client, user, auth_tokens):
        session = UserSession.objects.create(
            user=user,
            refresh_token_jti=auth_tokens["jti"],
            device_name="Test",
            ip_address="127.0.0.1",
            user_agent="Test",
            expires_at=timezone.now() + timedelta(days=7),
        )
        session.revoked_at = timezone.now()
        session.save()

        response = client.post(
            "/api/v1/auth/token/refresh/",
            {"refresh": auth_tokens["refresh"]},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_refresh_invalid_token_rejected(self, client):
        response = client.post(
            "/api/v1/auth/token/refresh/",
            {"refresh": "invalid-token"},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_refresh_missing_token(self, client):
        response = client.post(
            "/api/v1/auth/token/refresh/",
            content_type="application/json",
        )
        assert response.status_code == 400