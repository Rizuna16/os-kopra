from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import (
    EmailVerificationToken,
    PasswordResetToken,
    create_token_hash,
)

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
    }


@pytest.fixture
def verified_user(db):
    user = User.objects.create_user(
        email="verified@example.com",
        password="SecurePass123!",
    )
    user.is_email_verified = True
    user.save()
    return user


@pytest.mark.django_db
class TestEmailVerifyView:
    def test_email_verify_success(self, client, user):
        raw_token, token_hash = create_token_hash()
        EmailVerificationToken.objects.create(
            user=user,
            token_hash=token_hash,
            expires_at=timezone.now() + timedelta(hours=24),
        )
        response = client.post(
            "/api/v1/auth/email/verify/",
            {"token": raw_token},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert "verified successfully" in response.data["message"].lower()
        user.refresh_from_db()
        assert user.is_email_verified is True

    def test_email_verify_invalid_token(self, client):
        response = client.post(
            "/api/v1/auth/email/verify/",
            {"token": "invalid-token"},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "invalid" in response.data["error"].lower()

    def test_email_verify_expired_token(self, client, user):
        raw_token, token_hash = create_token_hash()
        EmailVerificationToken.objects.create(
            user=user,
            token_hash=token_hash,
            expires_at=timezone.now() - timedelta(hours=1),
        )
        response = client.post(
            "/api/v1/auth/email/verify/",
            {"token": raw_token},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "expired" in response.data["error"].lower()

    def test_email_verify_already_verified(self, client, verified_user):
        raw_token, token_hash = create_token_hash()
        EmailVerificationToken.objects.create(
            user=verified_user,
            token_hash=token_hash,
            expires_at=timezone.now() + timedelta(hours=24),
            verified_at=timezone.now(),
        )
        response = client.post(
            "/api/v1/auth/email/verify/",
            {"token": raw_token},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "already" in response.data["error"].lower()

    def test_email_verify_sets_verified_at(self, client, user):
        raw_token, token_hash = create_token_hash()
        token_obj = EmailVerificationToken.objects.create(
            user=user,
            token_hash=token_hash,
            expires_at=timezone.now() + timedelta(hours=24),
        )
        client.post(
            "/api/v1/auth/email/verify/",
            {"token": raw_token},
            content_type="application/json",
        )
        token_obj.refresh_from_db()
        assert token_obj.verified_at is not None


@pytest.mark.django_db
class TestEmailResendView:
    def test_email_resend_success(self, client, user):
        response = client.post(
            "/api/v1/auth/email/resend/",
            {"email": user.email},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert len(mail.outbox) == 1
        assert user.email in mail.outbox[0].to

    def test_email_resend_nonexistent_email_returns_success(self, client):
        response = client.post(
            "/api/v1/auth/email/resend/",
            {"email": "nonexistent@example.com"},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert len(mail.outbox) == 0

    def test_email_resend_already_verified(self, client, verified_user):
        response = client.post(
            "/api/v1/auth/email/resend/",
            {"email": verified_user.email},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "already" in response.data["error"].lower()

    def test_email_resend_creates_token_hash_only(self, client, user):
        client.post(
            "/api/v1/auth/email/resend/",
            {"email": user.email},
            content_type="application/json",
        )
        token = EmailVerificationToken.objects.filter(user=user).latest("created_at")
        assert len(token.token_hash) == 64
        assert all(c in "0123456789abcdef" for c in token.token_hash)

    def test_email_resend_raw_token_not_in_database(self, client, user):
        client.post(
            "/api/v1/auth/email/resend/",
            {"email": user.email},
            content_type="application/json",
        )
        email_body = mail.outbox[0].body
        raw_token_in_email = None
        for word in email_body.split():
            if len(word) > 40 and "/" not in word and ":" not in word:
                raw_token_in_email = word
                break
        assert raw_token_in_email is not None
        token_obj = EmailVerificationToken.objects.filter(user=user).latest("created_at")
        assert raw_token_in_email != token_obj.token_hash


@pytest.mark.django_db
class TestPasswordForgotView:
    def test_password_forgot_success(self, client, user):
        response = client.post(
            "/api/v1/auth/password/forgot/",
            {"email": user.email},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert len(mail.outbox) == 1
        assert user.email in mail.outbox[0].to

    def test_password_forgot_nonexistent_email_returns_success(self, client):
        response = client.post(
            "/api/v1/auth/password/forgot/",
            {"email": "nonexistent@example.com"},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert len(mail.outbox) == 0

    def test_password_forgot_creates_token_hash_only(self, client, user):
        client.post(
            "/api/v1/auth/password/forgot/",
            {"email": user.email},
            content_type="application/json",
        )
        token = PasswordResetToken.objects.filter(user=user).latest("created_at")
        assert len(token.token_hash) == 64
        assert all(c in "0123456789abcdef" for c in token.token_hash)

    def test_password_forgot_stores_ip_address(self, client, user):
        client.post(
            "/api/v1/auth/password/forgot/",
            {"email": user.email},
            content_type="application/json",
        )
        token = PasswordResetToken.objects.filter(user=user).latest("created_at")
        assert token.ip_address is not None

    def test_password_forgot_raw_token_not_in_database(self, client, user):
        client.post(
            "/api/v1/auth/password/forgot/",
            {"email": user.email},
            content_type="application/json",
        )
        email_body = mail.outbox[0].body
        raw_token_in_email = None
        for word in email_body.split():
            if len(word) > 40 and "/" not in word and ":" not in word:
                raw_token_in_email = word
                break
        assert raw_token_in_email is not None
        token_obj = PasswordResetToken.objects.filter(user=user).latest("created_at")
        assert raw_token_in_email != token_obj.token_hash

    def test_password_forgot_inactive_user_no_email(self, client):
        user = User.objects.create_user(
            email="inactive@example.com",
            password="SecurePass123!",
        )
        user.is_active = False
        user.save()
        response = client.post(
            "/api/v1/auth/password/forgot/",
            {"email": user.email},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert len(mail.outbox) == 0

    def test_password_forgot_invalidates_previous_unused_tokens(self, client, user):
        old_raw_token, old_token_hash = create_token_hash()

        old_token = PasswordResetToken.objects.create(
            user=user,
            token_hash=old_token_hash,
            ip_address="127.0.0.1",
            expires_at=timezone.now() + timedelta(hours=1),
        )

        response = client.post(
            "/api/v1/auth/password/forgot/",
            {"email": user.email},
            content_type="application/json",
        )

        assert response.status_code == 200

        old_token.refresh_from_db()
        assert old_token.used_at is not None

        active_tokens = PasswordResetToken.objects.filter(
            user=user,
            used_at__isnull=True,
        )

        assert active_tokens.count() == 1


@pytest.mark.django_db
class TestPasswordResetView:
    def test_password_reset_success(self, client, user):
        raw_token, token_hash = create_token_hash()
        PasswordResetToken.objects.create(
            user=user,
            token_hash=token_hash,
            ip_address="127.0.0.1",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        old_password_hash = user.password
        response = client.post(
            "/api/v1/auth/password/reset/",
            {
                "token": raw_token,
                "password": "NewSecurePass456!",
                "password_confirm": "NewSecurePass456!",
            },
            content_type="application/json",
        )
        assert response.status_code == 200
        user.refresh_from_db()
        assert user.password != old_password_hash
        assert user.check_password("NewSecurePass456!")

    def test_password_reset_invalid_token(self, client):
        response = client.post(
            "/api/v1/auth/password/reset/",
            {
                "token": "invalid-token",
                "password": "NewSecurePass456!",
                "password_confirm": "NewSecurePass456!",
            },
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "invalid" in response.data["error"].lower()

    def test_password_reset_expired_token(self, client, user):
        raw_token, token_hash = create_token_hash()
        PasswordResetToken.objects.create(
            user=user,
            token_hash=token_hash,
            ip_address="127.0.0.1",
            expires_at=timezone.now() - timedelta(hours=1),
        )
        response = client.post(
            "/api/v1/auth/password/reset/",
            {
                "token": raw_token,
                "password": "NewSecurePass456!",
                "password_confirm": "NewSecurePass456!",
            },
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "expired" in response.data["error"].lower()

    def test_password_reset_used_token(self, client, user):
        raw_token, token_hash = create_token_hash()
        PasswordResetToken.objects.create(
            user=user,
            token_hash=token_hash,
            ip_address="127.0.0.1",
            expires_at=timezone.now() + timedelta(hours=1),
            used_at=timezone.now(),
        )
        response = client.post(
            "/api/v1/auth/password/reset/",
            {
                "token": raw_token,
                "password": "NewSecurePass456!",
                "password_confirm": "NewSecurePass456!",
            },
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "used" in response.data["error"].lower()

    def test_password_reset_sets_used_at(self, client, user):
        raw_token, token_hash = create_token_hash()
        token_obj = PasswordResetToken.objects.create(
            user=user,
            token_hash=token_hash,
            ip_address="127.0.0.1",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        client.post(
            "/api/v1/auth/password/reset/",
            {
                "token": raw_token,
                "password": "NewSecurePass456!",
                "password_confirm": "NewSecurePass456!",
            },
            content_type="application/json",
        )
        token_obj.refresh_from_db()
        assert token_obj.used_at is not None

    def test_password_reset_updates_password_changed_at(self, client, user):
        raw_token, token_hash = create_token_hash()
        PasswordResetToken.objects.create(
            user=user,
            token_hash=token_hash,
            ip_address="127.0.0.1",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        old_changed_at = user.password_changed_at
        client.post(
            "/api/v1/auth/password/reset/",
            {
                "token": raw_token,
                "password": "NewSecurePass456!",
                "password_confirm": "NewSecurePass456!",
            },
            content_type="application/json",
        )
        user.refresh_from_db()
        assert user.password_changed_at >= old_changed_at

    def test_password_reset_password_mismatch(self, client, user):
        raw_token, token_hash = create_token_hash()
        PasswordResetToken.objects.create(
            user=user,
            token_hash=token_hash,
            ip_address="127.0.0.1",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        response = client.post(
            "/api/v1/auth/password/reset/",
            {
                "token": raw_token,
                "password": "NewSecurePass456!",
                "password_confirm": "DifferentPass789!",
            },
            content_type="application/json",
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestPasswordChangeView:
    def test_password_change_success(self, client, user, auth_tokens):
        old_password_hash = user.password
        response = client.post(
            "/api/v1/auth/password/change/",
            {
                "current_password": "SecurePass123!",
                "new_password": "NewSecurePass456!",
                "new_password_confirm": "NewSecurePass456!",
            },
            HTTP_AUTHORIZATION=f"Bearer {auth_tokens['access']}",
            content_type="application/json",
        )
        assert response.status_code == 200
        user.refresh_from_db()
        assert user.password != old_password_hash
        assert user.check_password("NewSecurePass456!")

    def test_password_change_wrong_current_password(self, client, user, auth_tokens):
        response = client.post(
            "/api/v1/auth/password/change/",
            {
                "current_password": "WrongPass123!",
                "new_password": "NewSecurePass456!",
                "new_password_confirm": "NewSecurePass456!",
            },
            HTTP_AUTHORIZATION=f"Bearer {auth_tokens['access']}",
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "incorrect" in response.data["errors"]["current_password"][0].lower()

    def test_password_change_password_mismatch(self, client, user, auth_tokens):
        response = client.post(
            "/api/v1/auth/password/change/",
            {
                "current_password": "SecurePass123!",
                "new_password": "NewSecurePass456!",
                "new_password_confirm": "DifferentPass789!",
            },
            HTTP_AUTHORIZATION=f"Bearer {auth_tokens['access']}",
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_password_change_updates_password_changed_at(self, client, user, auth_tokens):
        old_changed_at = user.password_changed_at
        client.post(
            "/api/v1/auth/password/change/",
            {
                "current_password": "SecurePass123!",
                "new_password": "NewSecurePass456!",
                "new_password_confirm": "NewSecurePass456!",
            },
            HTTP_AUTHORIZATION=f"Bearer {auth_tokens['access']}",
            content_type="application/json",
        )
        user.refresh_from_db()
        assert user.password_changed_at >= old_changed_at

    def test_password_change_requires_auth(self, client):
        response = client.post(
            "/api/v1/auth/password/change/",
            {
                "current_password": "SecurePass123!",
                "new_password": "NewSecurePass456!",
                "new_password_confirm": "NewSecurePass456!",
            },
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_password_change_weak_password_rejected(self, client, user, auth_tokens):
        response = client.post(
            "/api/v1/auth/password/change/",
            {
                "current_password": "SecurePass123!",
                "new_password": "123",
                "new_password_confirm": "123",
            },
            HTTP_AUTHORIZATION=f"Bearer {auth_tokens['access']}",
            content_type="application/json",
        )
        assert response.status_code == 400
