import uuid
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone

from apps.authentication.models import (
    UserSession,
    EmailVerificationToken,
    PasswordResetToken,
    generate_secure_token,
    hash_token,
    create_token_hash,
)

User = get_user_model()


@pytest.mark.django_db
class TestUserSession:
    def test_create_user_session(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        session = UserSession.objects.create(
            user=user,
            refresh_token_jti="unique-jti-123",
            device_name="Chrome on Windows",
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            expires_at=timezone.now() + timedelta(days=7),
        )
        assert session.user == user
        assert session.refresh_token_jti == "unique-jti-123"
        assert session.device_name == "Chrome on Windows"
        assert session.ip_address == "192.168.1.1"
        assert session.user_agent == "Mozilla/5.0"
        assert session.created_at is not None
        assert session.last_activity is not None
        assert session.expires_at > timezone.now()
        assert session.revoked_at is None

    def test_user_session_relationship_with_user(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        session = UserSession.objects.create(
            user=user,
            refresh_token_jti="jti-1",
            ip_address="127.0.0.1",
            user_agent="Agent",
            expires_at=timezone.now() + timedelta(days=1),
        )
        assert user.sessions.count() == 1
        assert user.sessions.first() == session

    def test_jti_uniqueness(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        UserSession.objects.create(
            user=user,
            refresh_token_jti="same-jti",
            ip_address="127.0.0.1",
            user_agent="Agent",
            expires_at=timezone.now() + timedelta(days=1),
        )
        with pytest.raises(IntegrityError):
            UserSession.objects.create(
                user=user,
                refresh_token_jti="same-jti",
                ip_address="127.0.0.1",
                user_agent="Agent",
                expires_at=timezone.now() + timedelta(days=1),
            )

    def test_is_expired_false_when_not_expired(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        session = UserSession.objects.create(
            user=user,
            refresh_token_jti="jti-2",
            ip_address="127.0.0.1",
            user_agent="Agent",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        assert session.is_expired is False

    def test_is_expired_true_when_expired(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        session = UserSession.objects.create(
            user=user,
            refresh_token_jti="jti-3",
            ip_address="127.0.0.1",
            user_agent="Agent",
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        assert session.is_expired is True

    def test_is_revoked_false_when_not_revoked(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        session = UserSession.objects.create(
            user=user,
            refresh_token_jti="jti-4",
            ip_address="127.0.0.1",
            user_agent="Agent",
            expires_at=timezone.now() + timedelta(days=1),
        )
        assert session.is_revoked is False

    def test_is_revoked_true_when_revoked(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        session = UserSession.objects.create(
            user=user,
            refresh_token_jti="jti-5",
            ip_address="127.0.0.1",
            user_agent="Agent",
            expires_at=timezone.now() + timedelta(days=1),
            revoked_at=timezone.now(),
        )
        assert session.is_revoked is True

    def test_is_valid_true_when_active(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        session = UserSession.objects.create(
            user=user,
            refresh_token_jti="jti-6",
            ip_address="127.0.0.1",
            user_agent="Agent",
            expires_at=timezone.now() + timedelta(days=1),
        )
        assert session.is_valid is True

    def test_is_valid_false_when_expired(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        session = UserSession.objects.create(
            user=user,
            refresh_token_jti="jti-7",
            ip_address="127.0.0.1",
            user_agent="Agent",
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        assert session.is_valid is False

    def test_is_valid_false_when_revoked(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        session = UserSession.objects.create(
            user=user,
            refresh_token_jti="jti-8",
            ip_address="127.0.0.1",
            user_agent="Agent",
            expires_at=timezone.now() + timedelta(days=1),
            revoked_at=timezone.now(),
        )
        assert session.is_valid is False

    def test_session_fields(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        session = UserSession.objects.create(
            user=user,
            refresh_token_jti="jti-9",
            device_name="iPhone",
            ip_address="10.0.0.1",
            user_agent="Safari/600",
            expires_at=timezone.now() + timedelta(days=1),
        )
        assert isinstance(session.id, uuid.UUID)
        assert session.device_name == "iPhone"
        assert str(session.ip_address) == "10.0.0.1"


@pytest.mark.django_db
class TestEmailVerificationToken:
    def test_create_email_verification_token(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = EmailVerificationToken.objects.create(
            user=user,
            token_hash="a" * 64,
            expires_at=timezone.now() + timedelta(hours=24),
        )
        assert token.user == user
        assert token.token_hash == "a" * 64
        assert token.created_at is not None
        assert token.expires_at > timezone.now()
        assert token.verified_at is None

    def test_email_verification_token_relationship_with_user(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = EmailVerificationToken.objects.create(
            user=user,
            token_hash="b" * 64,
            expires_at=timezone.now() + timedelta(hours=24),
        )
        assert user.email_verifications.count() == 1
        assert user.email_verifications.first() == token

    def test_token_hash_uniqueness(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        EmailVerificationToken.objects.create(
            user=user,
            token_hash="c" * 64,
            expires_at=timezone.now() + timedelta(hours=24),
        )
        with pytest.raises(IntegrityError):
            EmailVerificationToken.objects.create(
                user=user,
                token_hash="c" * 64,
                expires_at=timezone.now() + timedelta(hours=24),
            )

    def test_is_expired_false_when_not_expired(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = EmailVerificationToken.objects.create(
            user=user,
            token_hash="d" * 64,
            expires_at=timezone.now() + timedelta(hours=24),
        )
        assert token.is_expired is False

    def test_is_expired_true_when_expired(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = EmailVerificationToken.objects.create(
            user=user,
            token_hash="e" * 64,
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        assert token.is_expired is True

    def test_is_verified_false_when_not_verified(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = EmailVerificationToken.objects.create(
            user=user,
            token_hash="f" * 64,
            expires_at=timezone.now() + timedelta(hours=24),
        )
        assert token.is_verified is False

    def test_is_verified_true_when_verified(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = EmailVerificationToken.objects.create(
            user=user,
            token_hash="g" * 64,
            expires_at=timezone.now() + timedelta(hours=24),
            verified_at=timezone.now(),
        )
        assert token.is_verified is True

    def test_is_valid_true_when_active(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = EmailVerificationToken.objects.create(
            user=user,
            token_hash="h" * 64,
            expires_at=timezone.now() + timedelta(hours=24),
        )
        assert token.is_valid is True

    def test_is_valid_false_when_expired(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = EmailVerificationToken.objects.create(
            user=user,
            token_hash="i" * 64,
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        assert token.is_valid is False

    def test_is_valid_false_when_verified(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = EmailVerificationToken.objects.create(
            user=user,
            token_hash="j" * 64,
            expires_at=timezone.now() + timedelta(hours=24),
            verified_at=timezone.now(),
        )
        assert token.is_valid is False


@pytest.mark.django_db
class TestPasswordResetToken:
    def test_create_password_reset_token(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = PasswordResetToken.objects.create(
            user=user,
            token_hash="k" * 64,
            ip_address="192.168.1.1",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        assert token.user == user
        assert token.token_hash == "k" * 64
        assert str(token.ip_address) == "192.168.1.1"
        assert token.created_at is not None
        assert token.expires_at > timezone.now()
        assert token.used_at is None

    def test_password_reset_token_relationship_with_user(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = PasswordResetToken.objects.create(
            user=user,
            token_hash="l" * 64,
            ip_address="127.0.0.1",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        assert user.password_resets.count() == 1
        assert user.password_resets.first() == token

    def test_token_hash_uniqueness(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        PasswordResetToken.objects.create(
            user=user,
            token_hash="m" * 64,
            ip_address="127.0.0.1",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        with pytest.raises(IntegrityError):
            PasswordResetToken.objects.create(
                user=user,
                token_hash="m" * 64,
                ip_address="127.0.0.1",
                expires_at=timezone.now() + timedelta(hours=1),
            )

    def test_is_expired_false_when_not_expired(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = PasswordResetToken.objects.create(
            user=user,
            token_hash="n" * 64,
            ip_address="127.0.0.1",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        assert token.is_expired is False

    def test_is_expired_true_when_expired(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = PasswordResetToken.objects.create(
            user=user,
            token_hash="o" * 64,
            ip_address="127.0.0.1",
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        assert token.is_expired is True

    def test_is_used_false_when_not_used(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = PasswordResetToken.objects.create(
            user=user,
            token_hash="p" * 64,
            ip_address="127.0.0.1",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        assert token.is_used is False

    def test_is_used_true_when_used(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = PasswordResetToken.objects.create(
            user=user,
            token_hash="q" * 64,
            ip_address="127.0.0.1",
            expires_at=timezone.now() + timedelta(hours=1),
            used_at=timezone.now(),
        )
        assert token.is_used is True

    def test_is_valid_true_when_active(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = PasswordResetToken.objects.create(
            user=user,
            token_hash="r" * 64,
            ip_address="127.0.0.1",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        assert token.is_valid is True

    def test_is_valid_false_when_expired(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = PasswordResetToken.objects.create(
            user=user,
            token_hash="s" * 64,
            ip_address="127.0.0.1",
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        assert token.is_valid is False

    def test_is_valid_false_when_used(self):
        user = User.objects.create_user(email="test@example.com", password="pass123")
        token = PasswordResetToken.objects.create(
            user=user,
            token_hash="t" * 64,
            ip_address="127.0.0.1",
            expires_at=timezone.now() + timedelta(hours=1),
            used_at=timezone.now(),
        )
        assert token.is_valid is False


class TestTokenSecurity:
    def test_generate_secure_token_returns_string(self):
        token = generate_secure_token()
        assert isinstance(token, str)
        assert len(token) > 0

    def test_generate_secure_token_uniqueness(self):
        token1 = generate_secure_token()
        token2 = generate_secure_token()
        assert token1 != token2

    def test_hash_token_returns_64_characters(self):
        token = "test-token-123"
        token_hash = hash_token(token)
        assert len(token_hash) == 64

    def test_hash_token_is_sha256_hexdigest(self):
        token = "test-token-123"
        token_hash = hash_token(token)
        assert all(c in "0123456789abcdef" for c in token_hash)

    def test_different_tokens_produce_different_hashes(self):
        hash1 = hash_token("token1")
        hash2 = hash_token("token2")
        assert hash1 != hash2

    def test_same_token_produces_same_hash(self):
        hash1 = hash_token("same-token")
        hash2 = hash_token("same-token")
        assert hash1 == hash2

    def test_create_token_hash_returns_tuple(self):
        result = create_token_hash()
        assert isinstance(result, tuple)
        assert len(result) == 2

    def test_create_token_hash_returns_token_and_hash(self):
        token, token_hash = create_token_hash()
        assert isinstance(token, str)
        assert isinstance(token_hash, str)
        assert len(token_hash) == 64

    def test_create_token_hash_hash_matches_token(self):
        token, token_hash = create_token_hash()
        expected_hash = hash_token(token)
        assert token_hash == expected_hash

    def test_raw_token_not_stored_in_hash(self):
        token, token_hash = create_token_hash()
        assert token not in token_hash
