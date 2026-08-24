import pytest


try:
    from apps.onlinestore.models import OnlineStore, OnlineStoreProduct
except Exception:  # RED: module absent until implementation
    OnlineStore = OnlineStoreProduct = None


pytestmark = pytest.mark.django_db


class TestPublicCatalog:
    def test_access_by_slug_not_business_id(
        self, require_part22, auth_client, business, location, product, variant
    ):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko", "slug": "toko-pub", "default_location": str(location.id)},
            content_type="application/json",
        )
        store = OnlineStore.objects.get(business=business)
        OnlineStoreProduct.objects.create(online_store=store, product=product, is_published=True)

        response = auth_client.get("/api/v1/stores/toko-pub/products/")
        assert response.status_code == 200
        # No business_id in URL; resolution is by slug only.
        assert len(response.data) >= 1

    def test_only_published_products_visible(
        self, require_part22, auth_client, business, location, product, other_product
    ):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko", "slug": "toko-pub2", "default_location": str(location.id)},
            content_type="application/json",
        )
        store = OnlineStore.objects.get(business=business)
        OnlineStoreProduct.objects.create(online_store=store, product=product, is_published=True)
        OnlineStoreProduct.objects.create(
            online_store=store, product=other_product, is_published=False
        )
        response = auth_client.get("/api/v1/stores/toko-pub2/products/")
        ids = [item["id"] for item in response.data]
        assert str(product.id) in ids
        assert str(other_product.id) not in ids

    def test_exposes_product_id_name_price_only(
        self, require_part22, auth_client, business, location, product, variant
    ):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko", "slug": "toko-pub3", "default_location": str(location.id)},
            content_type="application/json",
        )
        store = OnlineStore.objects.get(business=business)
        OnlineStoreProduct.objects.create(online_store=store, product=product, is_published=True)

        response = auth_client.get("/api/v1/stores/toko-pub3/products/")
        item = next(i for i in response.data if i["id"] == str(product.id))
        assert set(item.keys()) == {"id", "name", "price", "variants"}

    def test_exposes_variant_id_name_only(
        self, require_part22, auth_client, business, location, product, variant
    ):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko", "slug": "toko-pub4", "default_location": str(location.id)},
            content_type="application/json",
        )
        store = OnlineStore.objects.get(business=business)
        OnlineStoreProduct.objects.create(online_store=store, product=product, is_published=True)

        response = auth_client.get("/api/v1/stores/toko-pub4/products/")
        item = next(i for i in response.data if i["id"] == str(product.id))
        v = item["variants"][0]
        assert set(v.keys()) == {"id", "name", "available"}

    def test_exposes_computed_availability_default_location(
        self, require_part22, auth_client, business, location, product, variant, stock
    ):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko", "slug": "toko-pub5", "default_location": str(location.id)},
            content_type="application/json",
        )
        store = OnlineStore.objects.get(business=business)
        OnlineStoreProduct.objects.create(online_store=store, product=product, is_published=True)

        response = auth_client.get("/api/v1/stores/toko-pub5/products/")
        item = next(i for i in response.data if i["id"] == str(product.id))
        v = next(vr for vr in item["variants"] if vr["id"] == str(variant.id))
        assert v["available"] == 20

    def test_no_business_owner_internal_exposure(
        self, require_part22, auth_client, business, location, product, variant
    ):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko", "slug": "toko-pub6", "default_location": str(location.id)},
            content_type="application/json",
        )
        store = OnlineStore.objects.get(business=business)
        OnlineStoreProduct.objects.create(online_store=store, product=product, is_published=True)

        response = auth_client.get("/api/v1/stores/toko-pub6/products/")
        body = str(response.data)
        assert str(business.owner_id) not in body
        assert str(business.id) not in body

    def test_cross_business_access_fails(
        self,
        require_part22,
        auth_client,
        other_auth_client,
        business,
        other_business,
        location,
        other_location,
        product,
    ):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko", "slug": "store-b", "default_location": str(location.id)},
            content_type="application/json",
        )
        # A different business also tries to claim the same slug -> blocked.
        r = other_auth_client.post(
            f"/api/v1/businesses/{other_business.id}/online-stores/",
            {"name": "TokoLain", "slug": "store-b", "default_location": str(other_location.id)},
            content_type="application/json",
        )
        assert r.status_code == 400

    def test_unpublished_not_visible(
        self, require_part22, auth_client, business, location, product
    ):
        auth_client.post(
            f"/api/v1/businesses/{business.id}/online-stores/",
            {"name": "Toko", "slug": "toko-pub7", "default_location": str(location.id)},
            content_type="application/json",
        )
        store = OnlineStore.objects.get(business=business)
        OnlineStoreProduct.objects.create(online_store=store, product=product, is_published=False)
        response = auth_client.get("/api/v1/stores/toko-pub7/products/")
        ids = [item["id"] for item in response.data]
        assert str(product.id) not in ids
