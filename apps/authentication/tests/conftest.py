import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache

User = get_user_model()


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def verified_user(db):
    user = User.objects.create_user(
        email="verified@example.com",
        password="SecurePass123!",
        first_name="Verified",
        last_name="User",
    )
    user.is_email_verified = True
    user.save(update_fields=["is_email_verified"])
    return user