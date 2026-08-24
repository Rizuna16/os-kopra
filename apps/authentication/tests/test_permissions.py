import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory

from apps.authentication.permissions import IsOwner, IsVerified

User = get_user_model()


@pytest.mark.django_db
class TestIsOwner:
    def test_is_owner_rejects_unauthenticated_user(self):
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = None
        permission = IsOwner()
        assert permission.has_permission(request, None) is False

    def test_is_owner_accepts_object_owned_by_user(self):
        user = User.objects.create_user(email="owner@example.com", password="pass123")
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = user

        class MockObject:
            def __init__(self, user):
                self.user = user

        obj = MockObject(user)
        permission = IsOwner()
        assert permission.has_object_permission(request, None, obj) is True

    def test_is_owner_rejects_object_owned_by_different_user(self):
        owner = User.objects.create_user(email="owner@example.com", password="pass123")
        other_user = User.objects.create_user(email="other@example.com", password="pass123")
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = other_user

        class MockObject:
            def __init__(self, user):
                self.user = user

        obj = MockObject(owner)
        permission = IsOwner()
        assert permission.has_object_permission(request, None, obj) is False

    def test_is_owner_works_with_user_attribute(self):
        user = User.objects.create_user(email="user@example.com", password="pass123")
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = user

        class ObjectWithUser:
            def __init__(self, user):
                self.user = user

        obj = ObjectWithUser(user)
        permission = IsOwner()
        assert permission.has_object_permission(request, None, obj) is True

    def test_is_owner_rejects_object_without_user_attribute(self):
        user = User.objects.create_user(email="user@example.com", password="pass123")
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = user

        class ObjectWithoutUser:
            pass

        obj = ObjectWithoutUser()
        permission = IsOwner()
        assert permission.has_object_permission(request, None, obj) is False


@pytest.mark.django_db
class TestIsVerified:
    def test_is_verified_accepts_authenticated_verified_user(self):
        user = User.objects.create_user(email="verified@example.com", password="pass123")
        user.is_email_verified = True
        user.save()
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = user
        permission = IsVerified()
        assert permission.has_permission(request, None) is True

    def test_is_verified_rejects_authenticated_unverified_user(self):
        user = User.objects.create_user(email="unverified@example.com", password="pass123")
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = user
        permission = IsVerified()
        assert permission.has_permission(request, None) is False

    def test_is_verified_rejects_unauthenticated_user(self):
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = None
        permission = IsVerified()
        assert permission.has_permission(request, None) is False

    def test_is_verified_rejects_user_without_is_email_verified(self):
        user = User.objects.create_user(email="user@example.com", password="pass123")
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = user
        user.is_email_verified = False
        permission = IsVerified()
        assert permission.has_permission(request, None) is False
