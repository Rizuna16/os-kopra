from datetime import timedelta

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import PasswordHistory, PasswordResetToken, create_token_hash

User = get_user_model()


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="historyuser@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def auth_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token)}


def register_user(client, email="reguser@example.com", password="SecurePass123!"):
    return client.post(
        "/api/v1/auth/register/",
        {"email": email, "password": password, "password_confirm": password},
        content_type="application/json",
    )


def change_password(client, current_password, new_password, auth_tokens):
    return client.post(
        "/api/v1/auth/password/change/",
        {
            "current_password": current_password,
            "new_password": new_password,
            "new_password_confirm": new_password,
        },
        HTTP_AUTHORIZATION=f"Bearer {auth_tokens['access']}",
        content_type="application/json",
    )


def create_reset_token(user):
    raw_token, token_hash = create_token_hash()
    PasswordResetToken.objects.create(
        user=user,
        token_hash=token_hash,
        ip_address="127.0.0.1",
        expires_at=timezone.now() + timedelta(hours=1),
    )
    return raw_token


def reset_password(client, token, password):
    return client.post(
        "/api/v1/auth/password/reset/",
        {"token": token, "password": password, "password_confirm": password},
        content_type="application/json",
    )


# ── Registration Validation ────────────────────────────────────────────────────


@pytest.mark.django_db
class TestRegistrationValidation:
    def test_weak_password_rejected(self, client):
        resp = register_user(client, password="123")
        assert resp.status_code == 400

    def test_valid_password_accepted(self, client):
        resp = register_user(client, email="valid@example.com", password="SecurePass123!")
        assert resp.status_code == 201

    def test_password_mismatch_rejected(self, client):
        resp = client.post(
            "/api/v1/auth/register/",
            {"email": "mismatch@example.com", "password": "SecurePass123!", "password_confirm": "Different123!"},
            content_type="application/json",
        )
        assert resp.status_code == 400


# ── Password Change ────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPasswordChangeValidation:
    def test_wrong_current_password(self, client, user, auth_tokens):
        resp = change_password(client, "WrongPassword1!", "NewSecurePass1!", auth_tokens)
        assert resp.status_code == 400

    def test_weak_new_password_rejected(self, client, user, auth_tokens):
        resp = change_password(client, "SecurePass123!", "123", auth_tokens)
        assert resp.status_code == 400

    def test_same_password_rejected(self, client, user, auth_tokens):
        resp = change_password(client, "SecurePass123!", "SecurePass123!", auth_tokens)
        assert resp.status_code == 400

    def test_password_mismatch_rejected(self, client, user, auth_tokens):
        resp = client.post(
            "/api/v1/auth/password/change/",
            {
                "current_password": "SecurePass123!",
                "new_password": "NewSecurePass1!",
                "new_password_confirm": "DifferentPass2!",
            },
            HTTP_AUTHORIZATION=f"Bearer {auth_tokens['access']}",
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_valid_change_succeeds(self, client, user, auth_tokens):
        resp = change_password(client, "SecurePass123!", "NewSecurePass1!", auth_tokens)
        assert resp.status_code == 200
        user.refresh_from_db()
        assert user.check_password("NewSecurePass1!")


# ── Password Change History ────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPasswordChangeHistory:
    def test_history_record_created_on_success(self, client, user, auth_tokens):
        change_password(client, "SecurePass123!", "NewSecurePass1!", auth_tokens)
        assert PasswordHistory.objects.filter(user=user).count() == 1
        entry = PasswordHistory.objects.first()
        assert entry.password != "SecurePass123!"
        assert entry.user == user

    def test_no_history_on_wrong_current_password(self, client, user, auth_tokens):
        change_password(client, "WrongPassword1!", "NewSecurePass1!", auth_tokens)
        assert PasswordHistory.objects.filter(user=user).count() == 0

    def test_no_history_on_weak_password(self, client, user, auth_tokens):
        change_password(client, "SecurePass123!", "123", auth_tokens)
        assert PasswordHistory.objects.filter(user=user).count() == 0


# ── Password Reuse Prevention ──────────────────────────────────────────────────


@pytest.mark.django_db
class TestPasswordReusePrevention:
    def test_change_rejects_reused_password(self, client, user, auth_tokens):
        PasswordHistory.record_password(user, "OldPassword1!")
        resp = change_password(client, "SecurePass123!", "OldPassword1!", auth_tokens)
        assert resp.status_code == 400
        assert "already used" in str(resp.data).lower()

    def test_reset_rejects_reused_password(self, client, user):
        PasswordHistory.record_password(user, "OldPassword1!")
        token = create_reset_token(user)
        resp = reset_password(client, token, "OldPassword1!")
        assert resp.status_code == 400

    def test_reset_rejects_current_password(self, client, user):
        token = create_reset_token(user)
        resp = reset_password(client, token, "SecurePass123!")
        assert resp.status_code == 400

    def test_reset_rejects_weak_password(self, client, user):
        token = create_reset_token(user)
        resp = reset_password(client, token, "123")
        assert resp.status_code == 400


# ── Password Reset Success + History ───────────────────────────────────────────


@pytest.mark.django_db
class TestPasswordResetWithHistory:
    def test_reset_succeeds(self, client, user):
        token = create_reset_token(user)
        resp = reset_password(client, token, "NewSecurePass1!")
        assert resp.status_code == 200
        user.refresh_from_db()
        assert user.check_password("NewSecurePass1!")

    def test_history_record_created_on_reset(self, client, user):
        token = create_reset_token(user)
        reset_password(client, token, "NewSecurePass1!")
        assert PasswordHistory.objects.filter(user=user).count() == 1
        entry = PasswordHistory.objects.first()
        assert entry.user == user


# ── History Model Security ─────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPasswordHistorySecurity:
    def test_stores_hashes_not_plaintext(self, client, user, auth_tokens):
        change_password(client, "SecurePass123!", "NewSecurePass1!", auth_tokens)
        entry = PasswordHistory.objects.first()
        assert entry.password != "NewSecurePass1!"
        assert "$" in entry.password
        assert entry.user.check_password("NewSecurePass1!")


# ── History Retention ──────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPasswordHistoryRetention:
    def test_history_count_uses_settings(self, client, user, auth_tokens):
        with override_settings(AUTHENTICATION={**settings.AUTHENTICATION, "PASSWORD_HISTORY_COUNT": 3}):
            for i in range(3):
                old = "SecurePass123!" if i == 0 else f"NewPass{i}!"
                new = f"NewPass{i + 1}!"
                change_password(client, old, new, auth_tokens)
            assert PasswordHistory.objects.filter(user=user).count() == 3

    def test_older_records_removed_beyond_count(self, client, user, auth_tokens):
        with override_settings(AUTHENTICATION={"PASSWORD_HISTORY_COUNT": 3}):
            change_password(client, "SecurePass123!", "NewPass1!", auth_tokens)
            change_password(client, "NewPass1!", "NewPass2!", auth_tokens)
            change_password(client, "NewPass2!", "NewPass3!", auth_tokens)
            assert PasswordHistory.objects.filter(user=user).count() == 3
            change_password(client, "NewPass3!", "NewPass4!", auth_tokens)
            assert PasswordHistory.objects.filter(user=user).count() == 3
            change_password(client, "NewPass4!", "NewPass5!", auth_tokens)
            assert PasswordHistory.objects.filter(user=user).count() == 3


# ── Registration Creates Initial History ───────────────────────────────────────


@pytest.mark.django_db
class TestRegistrationPasswordHistory:
    def test_registration_creates_initial_history(self, client):
        resp = register_user(client, email="inithistory@example.com", password="SecurePass123!")
        assert resp.status_code == 201
        new_user = User.objects.get(email="inithistory@example.com")
        assert PasswordHistory.objects.filter(user=new_user).count() == 1
        entry = PasswordHistory.objects.get(user=new_user)
        assert entry.password != "SecurePass123!"
        assert new_user.check_password("SecurePass123!")