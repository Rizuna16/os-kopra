import uuid

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        user = User.objects.create_user(
            email="test@example.com",
            password="securepass123",
            first_name="John",
            last_name="Doe",
        )
        assert user.email == "test@example.com"
        assert user.first_name == "John"
        assert user.last_name == "Doe"
        assert user.is_active is True
        assert user.is_staff is False
        assert user.is_superuser is False
        assert user.is_email_verified is False
        assert isinstance(user.id, uuid.UUID)
        assert user.password_changed_at is not None
        assert user.created_at is not None
        assert user.updated_at is not None

    def test_email_normalization(self):
        user = User.objects.create_user(
            email="TEST@EXAMPLE.COM",
            password="securepass123",
        )
        assert user.email == "TEST@example.com"
        assert user.email.split("@")[1] == "example.com"

    def test_password_is_hashed(self):
        user = User.objects.create_user(
            email="test@example.com",
            password="securepass123",
        )
        assert user.password != "securepass123"
        assert "$" in user.password

    def test_password_check_works(self):
        user = User.objects.create_user(
            email="test@example.com",
            password="securepass123",
        )
        assert user.check_password("securepass123") is True
        assert user.check_password("wrongpass") is False

    def test_user_requires_email(self):
        with pytest.raises(ValueError, match="The Email field must be set"):
            User.objects.create_user(email="", password="securepass123")

    def test_duplicate_email_rejected(self):
        User.objects.create_user(email="test@example.com", password="securepass123")
        with pytest.raises(IntegrityError):
            User.objects.create_user(email="test@example.com", password="otherpass")

    def test_uuid_primary_key_generated(self):
        user = User.objects.create_user(email="test@example.com", password="securepass123")
        assert isinstance(user.id, uuid.UUID)
        assert user.pk == user.id

    def test_default_is_active_true(self):
        user = User.objects.create_user(email="test@example.com", password="securepass123")
        assert user.is_active is True

    def test_default_is_email_verified_false(self):
        user = User.objects.create_user(email="test@example.com", password="securepass123")
        assert user.is_email_verified is False

    def test_str_representation(self):
        user = User.objects.create_user(email="test@example.com", password="securepass123")
        assert str(user) == "test@example.com"


@pytest.mark.django_db
class TestUserManager:
    def test_create_superuser(self):
        user = User.objects.create_superuser(
            email="admin@example.com",
            password="adminpass123",
        )
        assert user.email == "admin@example.com"
        assert user.is_staff is True
        assert user.is_superuser is True
        assert user.is_active is True
        assert user.check_password("adminpass123") is True

    def test_create_superuser_enforces_is_staff(self):
        with pytest.raises(ValueError, match="Superuser must have is_staff=True"):
            User.objects.create_superuser(
                email="admin@example.com",
                password="adminpass123",
                is_staff=False,
            )

    def test_create_superuser_enforces_is_superuser(self):
        with pytest.raises(ValueError, match="Superuser must have is_superuser=True"):
            User.objects.create_superuser(
                email="admin@example.com",
                password="adminpass123",
                is_superuser=False,
            )