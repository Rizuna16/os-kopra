import pytest


try:
    from apps.onlinestore.models import OnlineStore, OnlineStoreProduct
except Exception:  # RED: module absent until implementation
    OnlineStore = OnlineStoreProduct = None


pytestmark = pytest.mark.django_db


class TestOnlineStoreProduct:
    def test_owner_can_publish_product_same_business(
        self, require_part22, auth_client, business, location, product
    ):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko", "slug": "toko", "default_location": str(location.id)},
            content_type="application/json",
        )
        store = OnlineStore.objects.get(business=business)
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/{store.id}/products/",
            {"product": str(product.id), "is_published": True},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert OnlineStoreProduct.objects.filter(
            online_store=store, product=product, is_published=True
        ).exists()

    # Contract §7: Publishing creates OnlineStoreProduct when none exists.
    # Unpublishing UPDATES the existing record (is_published=True→False),
    # not a second create. Use PATCH on the publish detail endpoint.
    def test_owner_can_unpublish_product(
        self, require_part22, auth_client, business, location, product
    ):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko", "slug": "toko", "default_location": str(location.id)},
            content_type="application/json",
        )
        store = OnlineStore.objects.get(business=business)
        # Create the publishing record (POST).
        auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/{store.id}/products/",
            {"product": str(product.id), "is_published": True},
            content_type="application/json",
        )
        # Unpublish = PATCH to the product-publish detail endpoint.
        response = auth_client.patch(
            f"/api/v1/businesses/{business.id}/online-stores/{store.id}/products/{product.id}/",
            {"is_published": False},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert OnlineStoreProduct.objects.get(
            online_store=store, product=product
        ).is_published is False

    def test_product_publish_only_same_business_store(
        self, require_part22, other_auth_client, other_business, other_location, other_product
    ):
        other_auth_client.post(
            f"/api/v1/businesses/{other_business.id}/online-stores/",
            {"name": "Toko Lain", "slug": "toko-lain", "default_location": str(other_location.id)},
            content_type="application/json",
        )
        store = OnlineStore.objects.get(business=other_business)
        response = other_auth_client.post(
            f"/api/v1/businesses/{other_business.id}/online-stores/{store.id}/products/",
            {"product": str(other_product.id), "is_published": True},
            content_type="application/json",
        )
        assert response.status_code == 201

    # Duplicate CREATE of (online_store, product) must be rejected (400).
    def test_unique_online_store_product(
        self, require_part22, auth_client, business, location, product
    ):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko", "slug": "toko", "default_location": str(location.id)},
            content_type="application/json",
        )
        store = OnlineStore.objects.get(business=business)
        auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/{store.id}/products/",
            {"product": str(product.id), "is_published": True},
            content_type="application/json",
        )
        response = auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/{store.id}/products/",
            {"product": str(product.id), "is_published": True},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert OnlineStoreProduct.objects.filter(online_store=store).count() == 1

    def test_unpublished_product_not_in_public_catalog(
        self, require_part22, auth_client, business, location, product
    ):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko", "slug": "toko", "default_location": str(location.id)},
            content_type="application/json",
        )
        store = OnlineStore.objects.get(business=business)
        OnlineStoreProduct.objects.create(online_store=store, product=product, is_published=False)
        response = auth_client.get("/api/v1/stores/toko/products/")
        assert response.status_code == 200
        ids = [item["id"] for item in response.data]
        assert str(product.id) not in ids