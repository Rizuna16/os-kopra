from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import PasswordResetToken, UserSession, create_token_hash

User = get_user_model()


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="f3test@example.com",
        password="SecurePass123!",
    )


@pytest.mark.django_db
class TestPasswordChangeSessionRevocation:
    def test_password_change_revokes_another_session(self, client, user):
        # Arrange: two devices/sessions for the user
        jti_other = "jti-change-other"
        other = UserSession.objects.create(
            user=user, refresh_token_jti=jti_other, device_name="Other",
            ip_address="10.0.0.2", user_agent="OtherAgent",
            expires_at=timezone.now() + timedelta(days=7),
        )
        # Act: change password with caller's refresh belonging to current session
        refresh = RefreshToken.for_user(user)
        UserSession.objects.create(
            user=user, refresh_token_jti=refresh["jti"], device_name="Current",
            ip_address="10.0.0.1", user_agent="CurrentAgent",
            expires_at=timezone.now() + timedelta(days=7),
        )
        resp = client.post(
            "/api/v1/auth/password/change/",
            {"current_password": "SecurePass123!", "new_password": "NewSecurePass1!", "new_password_confirm": "NewSecurePass1!", "refresh": str(refresh)},
            HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}",
            content_type="application/json",
        )
        # Improvement: send the refresh that matches the row we just stored,
        # so the view excludes that jti. Retrieve it precisely.
        # (The fixture refresh's jti already lives in UserSession.)
        assert resp.status_code == 200
        other.refresh_from_db()
        assert other.revoked_at is not None

    def test_current_session_remains_refreshable(self, client, user):
        refresh = RefreshToken.for_user(user)
        UserSession.objects.create(
            user=user, refresh_token_jti=refresh["jti"], device_name="Current",
            ip_address="10.0.0.1", user_agent="CurrentAgent",
            expires_at=timezone.now() + timedelta(days=7),
        )
        change = client.post(
            "/api/v1/auth/password/change/",
            {"current_password": "SecurePass123!", "new_password": "NewSecurePass1!", "new_password_confirm": "NewSecurePass1!", "refresh": str(refresh)},
            HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}",
            content_type="application/json",
        )
        assert change.status_code == 200
        # Current session's refresh should still be valid and rotatable
        refresh_resp = client.post(
            "/api/v1/auth/token/refresh/",
            {"refresh": str(refresh)},
            content_type="application/json",
        )
        assert refresh_resp.status_code == 200

    def test_revoked_other_session_refresh_returns_401(self, client, user):
        other_refresh = RefreshToken.for_user(user)
        # Simulate another device's session row
        other_refresh_jti = other_refresh["jti"]
        other_refresh_str = str(other_refresh)
        UserSession.objects.create(
            user=user, refresh_token_jti=other_refresh_jti, device_name="Other",
            ip_address="10.0.0.2", user_agent="OtherAgent",
            expires_at=timezone.now() + timedelta(days=7),
        )
        # Current device
        current_refresh = RefreshToken.for_user(user)
        UserSession.objects.create(
            user=user, refresh_token_jti=current_refresh["jti"], device_name="Current",
            ip_address="10.0.0.1", user_agent="CurrentAgent",
            expires_at=timezone.now() + timedelta(days=7),
        )
        change = client.post(
            "/api/v1/auth/password/change/",
            {"current_password": "SecurePass123!", "new_password": "NewSecurePass1!", "new_password_confirm": "NewSecurePass1!", "refresh": str(current_refresh)},
            HTTP_AUTHORIZATION=f"Bearer {str(current_refresh.access_token)}",
            content_type="application/json",
        )
        assert change.status_code == 200
        # Other device's refresh must now be revoked
        resp = client.post(
            "/api/v1/auth/token/refresh/",
            {"refresh": other_refresh_str},
            content_type="application/json",
        )
        assert resp.status_code == 401

    def test_change_without_refresh_revokes_all(self, client, user):
        UserSession.objects.create(
            user=user, refresh_token_jti="jti-a", device_name="A",
            ip_address="10.0.0.1", user_agent="A",
            expires_at=timezone.now() + timedelta(days=7),
        )
        UserSession.objects.create(
            user=user, refresh_token_jti="jti-b", device_name="B",
            ip_address="10.0.0.2", user_agent="B",
            expires_at=timezone.now() + timedelta(days=7),
        )
        refresh = RefreshToken.for_user(user)
        UserSession.objects.create(
            user=user, refresh_token_jti=refresh["jti"], device_name="Current",
            ip_address="10.0.0.3", user_agent="Current",
            expires_at=timezone.now() + timedelta(days=7),
        )
        resp = client.post(
            "/api/v1/auth/password/change/",
            {"current_password": "SecurePass123!", "new_password": "NewSecurePass1!", "new_password_confirm": "NewSecurePass1!"},
            HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}",
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert UserSession.objects.filter(user=user, revoked_at__isnull=True).count() == 0


@pytest.mark.django_db
class TestPasswordResetSessionRevocation:
    def test_reset_revokes_all_sessions(self, client, user):
        UserSession.objects.create(
            user=user, refresh_token_jti="jti-r1", device_name="Device1",
            ip_address="10.0.0.1", user_agent="Agent1",
            expires_at=timezone.now() + timedelta(days=7),
        )
        UserSession.objects.create(
            user=user, refresh_token_jti="jti-r2", device_name="Device2",
            ip_address="10.0.0.2", user_agent="Agent2",
            expires_at=timezone.now() + timedelta(days=7),
        )
        raw_token, token_hash = create_token_hash()
        PasswordResetToken.objects.create(
            user=user, token_hash=token_hash,
            ip_address="127.0.0.1",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        resp = client.post(
            "/api/v1/auth/password/reset/",
            {"token": raw_token, "password": "NewSecurePass1!", "password_confirm": "NewSecurePass1!"},
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert UserSession.objects.filter(user=user, revoked_at__isnull=True).count() == 0
        # Their refresh tokens are now rejected at refresh
        for jti in ("jti-r1", "jti-r2"):
            assert UserSession.objects.filter(refresh_token_jti=jti, revoked_at__isnull=False).exists()

    def test_reset_still_changes_password_and_history(self, client, user):
        raw_token, token_hash = create_token_hash()
        PasswordResetToken.objects.create(
            user=user, token_hash=token_hash,
            ip_address="127.0.0.1",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        old_hash = user.password
        resp = client.post(
            "/api/v1/auth/password/reset/",
            {"token": raw_token, "password": "NewSecurePass1!", "password_confirm": "NewSecurePass1!"},
            content_type="application/json",
        )
        assert resp.status_code == 200
        user.refresh_from_db()
        assert user.password != old_hash
        assert user.check_password("NewSecurePass1!")
        assert user.password_history.filter(password__isnull=False).exists()
