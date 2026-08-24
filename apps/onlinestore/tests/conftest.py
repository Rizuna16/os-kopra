import pytest
from django.contrib.auth import get_user_model

from apps.business.models import Business, Location
from apps.product.models import Product, Variant
from apps.inventory.models import Stock
from apps.customer.models import Customer

from rest_framework_simplejwt.tokens import RefreshToken


User = get_user_model()


# --------------------------------------------------------------------------
# PART 22 import guard.
# These modules do NOT exist yet (RED phase). The guard lets test collection
# succeed so each contract test fails individually (clean RED counts) instead
# of producing a single module-level import error.
# --------------------------------------------------------------------------
try:
    from apps.onlinestore.models import (
        OnlineStore,
        OnlineStoreProduct,
        Cart,
        CartItem,
        OnlineOrder,
        OnlineOrderLine,
    )
    PART22_MODELS = True
except Exception:
    OnlineStore = None
    OnlineStoreProduct = None
    Cart = None
    CartItem = None
    OnlineOrder = None
    OnlineOrderLine = None
    PART22_MODELS = False

try:
    from apps.onlinestore.serializers import (  # noqa: F401
        OnlineStoreSerializer,
        OnlineStoreProductSerializer,
        CartSerializer,
        CartItemSerializer,
        OnlineOrderSerializer,
        OnlineOrderLineSerializer,
    )
    PART22_SERIALIZERS = True
except Exception:
    PART22_SERIALIZERS = False

try:
    from apps.onlinestore.views import (  # noqa: F401
        OnlineStoreViewSet,
        OnlineStoreProductViewSet,
        PublicStoreView,
        PublicCatalogView,
        CartView,
        CheckoutView,
        OnlineOrderViewSet,
    )
    PART22_VIEWS = True
except Exception:
    PART22_VIEWS = False

try:
    import apps.onlinestore.urls  # noqa: F401
    PART22_URLS = True
except Exception:
    PART22_URLS = False


@pytest.fixture
def require_part22():
    """Fail the test if PART 22 implementation is absent (RED precondition)."""
    if not (PART22_MODELS and PART22_SERIALIZERS and PART22_VIEWS and PART22_URLS):
        pytest.fail("PART 22 (Online Store) is not implemented — RED precondition.")


# --------------------------------------------------------------------------
# Existing-domain fixtures (PART 1-21, unchanged).
# --------------------------------------------------------------------------
@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="onlinestore_owner@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="onlinestore_other@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def auth_tokens(user):
    return {"access": str(RefreshToken.for_user(user).access_token)}


@pytest.fixture
def other_tokens(other_user):
    return {"access": str(RefreshToken.for_user(other_user).access_token)}


@pytest.fixture
def auth_client(auth_tokens):
    from rest_framework.test import APIClient
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {auth_tokens['access']}")
    return client


@pytest.fixture
def other_auth_client(other_tokens):
    from rest_framework.test import APIClient
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {other_tokens['access']}")
    return client


@pytest.fixture
def business(db, user):
    return Business.objects.create(name="Toko Online Budi", owner=user)


@pytest.fixture
def other_business(db, other_user):
    return Business.objects.create(name="Toko Online Lain", owner=other_user)


@pytest.fixture
def location(db, business):
    return Location.objects.create(business=business, name="Cabang Dago")


@pytest.fixture
def other_location(db, other_business):
    return Location.objects.create(business=other_business, name="Cabang Lain")


@pytest.fixture
def product(db, business):
    return Product.objects.create(business=business, name="Sepatu Nike", price="100000")


@pytest.fixture
def variant(db, business, product):
    return Variant.objects.create(product=product, name="Hitam - 40")


@pytest.fixture
def other_product(db, other_business):
    return Product.objects.create(business=other_business, name="Sepatu Lain", price="50000")


@pytest.fixture
def other_variant(db, other_business, other_product):
    return Variant.objects.create(product=other_product, name="Putih - 41")


@pytest.fixture
def stock(business, location, variant):
    return Stock.objects.create(location=location, variant=variant, quantity=20)


@pytest.fixture
def customer(db, business):
    return Customer.objects.create(business=business, name="Pelanggan A")


@pytest.fixture
def other_customer(db, other_business):
    return Customer.objects.create(business=other_business, name="Pelanggan Lain")


# --------------------------------------------------------------------------
# Store-setup fixtures (Contract §1: OnlineStore created/activated by owner).
# These establish an activated OnlineStore so public slug routes (cart,
# checkout, catalog, lifecycle) have a real store to resolve — the public
# endpoints themselves MUST NOT auto-create a store.
# --------------------------------------------------------------------------
@pytest.fixture
def online_store(db, business, location):
    if not PART22_MODELS:
        pytest.fail("PART 22 (Online Store) is not implemented — RED precondition.")
    return OnlineStore.objects.create(
        business=business,
        name="Test Store",
        slug="test-store",
        default_location=location,
        is_active=True,
    )


@pytest.fixture
def published_product(db, online_store, product):
    if not PART22_MODELS:
        pytest.fail("PART 22 (Online Store) is not implemented — RED precondition.")
    OnlineStoreProduct.objects.create(
        online_store=online_store, product=product, is_published=True
    )
    return product


@pytest.fixture
def unpublished_product(db, business):
    return Product.objects.create(business=business, name="Unpublished", price="5000")


@pytest.fixture
def unpublished_variant(db, unpublished_product):
    return Variant.objects.create(product=unpublished_product, name="Unpub-V")
