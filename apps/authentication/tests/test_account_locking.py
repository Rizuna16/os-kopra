import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone

from apps.authentication.models import UserSession

User = get_user_model()


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def user(db):
    user = User.objects.create_user(
        email="locktest@example.com",
        password="SecurePass123!",
    )
    user.is_email_verified = True
    user.save(update_fields=["is_email_verified"])
    return user


def login_request(client, password="SecurePass123!", **extra):
    return client.post(
        "/api/v1/auth/login/",
        {"email": "locktest@example.com", "password": password},
        content_type="application/json",
        **extra,
    )


@pytest.mark.django_db
class TestAccountLocking:
    def test_wrong_password_increments_failed_attempts(self, client, user, db):
        resp = login_request(client, password="WrongPass123!", REMOTE_ADDR="192.168.1.1")
        assert resp.status_code == 401
        user.refresh_from_db()
        assert user.failed_login_attempts == 1
        assert user.last_login_ip == "192.168.1.1"
        assert user.locked_until is None

    def test_no_lock_before_threshold(self, client, user):
        for _ in range(4):
            resp = login_request(client, password="WrongPass123!")
            assert resp.status_code == 401
        user.refresh_from_db()
        assert user.failed_login_attempts == 4
        assert user.locked_until is None

    def test_lock_exactly_at_threshold(self, client, user):
        for _ in range(5):
            resp = login_request(client, password="WrongPass123!")
            assert resp.status_code == 401
        user.refresh_from_db()
        assert user.failed_login_attempts == 5
        assert user.locked_until is not None
        expected = timezone.now() + timezone.timedelta(minutes=15)
        assert user.locked_until > timezone.now()
        assert user.locked_until <= expected + timezone.timedelta(seconds=5)

    def test_login_rejected_while_locked(self, client, user):
        user.failed_login_attempts = 5
        user.locked_until = timezone.now() + timezone.timedelta(minutes=15)
        user.save(update_fields=["failed_login_attempts", "locked_until"])
        resp = login_request(client, REMOTE_ADDR="10.0.0.1")
        assert resp.status_code == 401
        assert "locked" in resp.data["error"].lower()

    def test_successful_login_resets_failed_attempts(self, client, user):
        user.failed_login_attempts = 3
        user.locked_until = None
        user.last_login_ip = "10.0.0.1"
        user.save(update_fields=["failed_login_attempts", "locked_until", "last_login_ip"])
        resp = login_request(client, REMOTE_ADDR="10.0.0.2")
        assert resp.status_code == 200
        user.refresh_from_db()
        assert user.failed_login_attempts == 0
        assert user.locked_until is None
        assert user.last_login_ip == "10.0.0.2"

    def test_successful_login_clears_locked_until(self, client, user):
        user.locked_until = timezone.now() - timezone.timedelta(minutes=1)
        user.failed_login_attempts = 5
        user.save(update_fields=["locked_until", "failed_login_attempts"])
        resp = login_request(client)
        assert resp.status_code == 200
        user.refresh_from_db()
        assert user.locked_until is None
        assert user.failed_login_attempts == 0

    def test_last_login_ip_stored_on_success(self, client, user):
        resp = login_request(client, REMOTE_ADDR="172.16.0.1")
        assert resp.status_code == 200
        user.refresh_from_db()
        assert user.last_login_ip == "172.16.0.1"

    def test_locked_account_does_not_create_session(self, client, user):
        user.failed_login_attempts = 5
        user.locked_until = timezone.now() + timezone.timedelta(minutes=15)
        user.save(update_fields=["failed_login_attempts", "locked_until"])
        resp = login_request(client, REMOTE_ADDR="10.0.0.1")
        assert resp.status_code == 401
        assert UserSession.objects.filter(user=user).count() == 0

    def test_lock_expired_allows_login_again(self, client, user):
        user.failed_login_attempts = 5
        user.locked_until = timezone.now() - timezone.timedelta(minutes=1)
        user.save(update_fields=["failed_login_attempts", "locked_until"])
        resp = login_request(client, REMOTE_ADDR="10.0.0.1")
        assert resp.status_code == 200
        user.refresh_from_db()
        assert user.failed_login_attempts == 0
        assert user.locked_until is None
        assert UserSession.objects.filter(user=user).count() == 1

    @override_settings(
        AUTHENTICATION={
            **settings.AUTHENTICATION,
            "MAX_FAILED_LOGIN_ATTEMPTS": 3,
            "ACCOUNT_LOCKOUT_MINUTES": 1,
        }
    )
    def test_threshold_config_from_settings(self, client, user):
        for _ in range(3):
            resp = login_request(client, password="WrongPass123!")
            assert resp.status_code == 401
        user.refresh_from_db()
        assert user.failed_login_attempts == 3
        assert user.locked_until is not None
        expected = timezone.now() + timezone.timedelta(minutes=1)
        assert user.locked_until <= expected + timezone.timedelta(seconds=5)

    @override_settings(
        AUTHENTICATION={
            **settings.AUTHENTICATION,
            "MAX_FAILED_LOGIN_ATTEMPTS": 10,
            "ACCOUNT_LOCKOUT_MINUTES": 15,
        }
    )
    def test_high_threshold_does_not_lock_early(self, client, user):
        for _ in range(5):
            resp = login_request(client, password="WrongPass123!")
            assert resp.status_code == 401
        user.refresh_from_db()
        assert user.failed_login_attempts == 5
        assert user.locked_until is None

    def test_inactive_user_still_rejected(self, client, user):
        user.is_active = False
        user.save(update_fields=["is_active"])
        resp = login_request(client)
        assert resp.status_code == 401
        assert "inactive" in resp.data["error"].lower()
        user.refresh_from_db()
        assert user.failed_login_attempts == 0

    def test_nonexistent_email_returns_safe_response(self, client):
        resp = client.post(
            "/api/v1/auth/login/",
            {"email": "doesnotexist@example.com", "password": "whatever"},
            content_type="application/json",
        )
        assert resp.status_code == 401
        assert "invalid" in resp.data["error"].lower()