import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import override_settings

from apps.authentication.throttles import (
    EmailResendRateThrottle,
    LoginRateThrottle,
    PasswordForgotRateThrottle,
)
from apps.authentication.views import (
    EmailResendView,
    EmailVerifyView,
    LoginView,
    LogoutAllView,
    LogoutView,
    PasswordChangeView,
    PasswordForgotView,
    PasswordResetView,
    RegisterView,
    TokenRefreshView,
    UserProfileView,
)

User = get_user_model()


@pytest.fixture
def user(db):
    user = User.objects.create_user(
        email="throttleuser@example.com",
        password="SecurePass123!",
    )
    user.is_email_verified = True
    user.save(update_fields=["is_email_verified"])
    return user


@pytest.fixture
def unverified_user(db):
    user = User.objects.create_user(
        email="unverified@example.com",
        password="SecurePass123!",
    )
    user.is_email_verified = False
    user.save(update_fields=["is_email_verified"])
    return user


def login_request(client, **extra):
    return client.post(
        "/api/v1/auth/login/",
        {"email": "throttleuser@example.com", "password": "SecurePass123!"},
        content_type="application/json",
        **extra,
    )


def forgot_request(client, **extra):
    return client.post(
        "/api/v1/auth/password/forgot/",
        {"email": "throttleuser@example.com"},
        content_type="application/json",
        **extra,
    )


def resend_request(client, **extra):
    return client.post(
        "/api/v1/auth/email/resend/",
        {"email": "throttleuser@example.com"},
        content_type="application/json",
        **extra,
    )


def _auth_settings(**overrides):
    merged = {k: v for k, v in settings.AUTHENTICATION.items()}
    merged.update(overrides)
    return merged


@pytest.mark.django_db
class TestLoginRateLimit:
    def test_login_allows_five_requests_then_429(self, client, user):
        for _ in range(5):
            resp = login_request(client)
            assert resp.status_code == 200
        resp = login_request(client)
        assert resp.status_code == 429

    def test_login_throttle_per_ip(self, client, user):
        for _ in range(5):
            resp = login_request(client, REMOTE_ADDR="10.0.0.1")
            assert resp.status_code == 200
        resp = login_request(client, REMOTE_ADDR="10.0.0.2")
        assert resp.status_code == 200

    def test_login_throttle_uses_ip(self, client, user):
        for _ in range(5):
            resp = login_request(client, REMOTE_ADDR="5.5.5.5")
            assert resp.status_code == 200
        resp = login_request(client, REMOTE_ADDR="5.5.5.5")
        assert resp.status_code == 429
        resp = login_request(client, REMOTE_ADDR="5.5.5.6")
        assert resp.status_code == 200

    def test_login_throttle_config_read_from_settings(self, client, user):
        with override_settings(AUTHENTICATION=_auth_settings(LOGIN_RATE_LIMIT_ATTEMPTS=2, LOGIN_RATE_LIMIT_WINDOW_MINUTES=15)):
            for _ in range(2):
                resp = login_request(client, REMOTE_ADDR="192.168.0.1")
                assert resp.status_code == 200
            resp = login_request(client, REMOTE_ADDR="192.168.0.1")
            assert resp.status_code == 429


@pytest.mark.django_db
class TestPasswordForgotRateLimit:
    def test_forgot_allows_three_requests_then_429(self, client, user):
        for _ in range(3):
            resp = forgot_request(client)
            assert resp.status_code == 200
        resp = forgot_request(client)
        assert resp.status_code == 429

    def test_forgot_throttle_per_ip(self, client, user):
        for _ in range(3):
            resp = forgot_request(client, REMOTE_ADDR="10.0.0.1")
            assert resp.status_code == 200
        resp = forgot_request(client, REMOTE_ADDR="10.0.0.2")
        assert resp.status_code == 200

    def test_forgot_throttle_config_read_from_settings(self, client, user):
        with override_settings(AUTHENTICATION=_auth_settings(PASSWORD_RESET_RATE_LIMIT_ATTEMPTS=1, PASSWORD_RESET_RATE_LIMIT_WINDOW_HOURS=1)):
            resp = forgot_request(client, REMOTE_ADDR="192.168.0.2")
            assert resp.status_code == 200
            resp = forgot_request(client, REMOTE_ADDR="192.168.0.2")
            assert resp.status_code == 429


@pytest.mark.django_db
class TestEmailResendRateLimit:
    def test_resend_allows_three_requests_then_429(self, client, unverified_user):
        for _ in range(3):
            resp = resend_request(client)
            assert resp.status_code == 200
        resp = resend_request(client)
        assert resp.status_code == 429

    def test_resend_throttle_per_ip(self, client, unverified_user):
        for _ in range(3):
            resp = resend_request(client, REMOTE_ADDR="10.0.0.1")
            assert resp.status_code == 200
        resp = resend_request(client, REMOTE_ADDR="10.0.0.2")
        assert resp.status_code == 200

    def test_resend_throttle_config_read_from_settings(self, client, unverified_user):
        with override_settings(AUTHENTICATION=_auth_settings(EMAIL_RESEND_RATE_LIMIT_ATTEMPTS=1, EMAIL_RESEND_RATE_LIMIT_WINDOW_HOURS=1)):
            resp = resend_request(client, REMOTE_ADDR="192.168.0.3")
            assert resp.status_code == 200
            resp = resend_request(client, REMOTE_ADDR="192.168.0.3")
            assert resp.status_code == 429


@pytest.mark.django_db
class TestOtherEndpointsNotThrottled:
    def test_register_not_throttled(self, client):
        for i in range(7):
            resp = client.post(
                "/api/v1/auth/register/",
                {
                    "email": f"regtest{i}@example.com",
                    "password": "SecurePass123!",
                    "password_confirm": "SecurePass123!",
                },
                content_type="application/json",
            )
            assert resp.status_code == 201

    def test_only_designated_views_have_throttles(self):
        assert LoginView.throttle_classes == [LoginRateThrottle]
        assert PasswordForgotView.throttle_classes == [PasswordForgotRateThrottle]
        assert EmailResendView.throttle_classes == [EmailResendRateThrottle]
        unthrottled = [
            RegisterView,
            EmailVerifyView,
            PasswordResetView,
            PasswordChangeView,
            LogoutView,
            LogoutAllView,
            UserProfileView,
            TokenRefreshView,
        ]
        for view in unthrottled:
            assert view.throttle_classes == [], f"{view.__name__} should have no throttles"