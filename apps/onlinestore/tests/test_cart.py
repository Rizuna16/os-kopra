import pytest


pytestmark = pytest.mark.django_db


class TestCart:
    def test_guest_uses_opaque_session_token(
        self, require_part22, client, online_store, published_product, variant
    ):
        from apps.onlinestore.models import Cart

        response = client.post(
            f"/api/v1/stores/{online_store.slug}/cart/",
            {"session_token": "opaque_guest_token_abc123", "variant": str(variant.id), "quantity": 1},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert Cart.objects.filter(session_token="opaque_guest_token_abc123").exists()

    def test_cart_bound_to_online_store(
        self, require_part22, client, online_store, published_product, variant
    ):
        from apps.onlinestore.models import Cart

        client.post(
            f"/api/v1/stores/{online_store.slug}/cart/",
            {"session_token": "tok_cart_1", "variant": str(variant.id), "quantity": 1},
            content_type="application/json",
        )
        cart = Cart.objects.get(session_token="tok_cart_1")
        assert cart.online_store_id == online_store.id
        assert cart.online_store_business_id == online_store.business_id

    # Contract §4: cart may contain only Variants of Products that are
    # published on that OnlineStore. An un-published variant must be rejected.
    def test_cart_only_published_store_variants(
        self, require_part22, client, online_store, unpublished_variant
    ):
        from apps.onlinestore.models import Cart

        response = client.post(
            f"/api/v1/stores/{online_store.slug}/cart/",
            {"session_token": "tok_cart_2", "variant": str(unpublished_variant.id), "quantity": 1},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert Cart.objects.filter(session_token="tok_cart_2").count() == 0

    def test_quantity_must_be_positive(
        self, require_part22, client, online_store, published_product, variant
    ):
        response = client.post(
            f"/api/v1/stores/{online_store.slug}/cart/",
            {"session_token": "tok_cart_3", "variant": str(variant.id), "quantity": 0},
            content_type="application/json",
        )
        assert response.status_code == 400

    # Cross-business isolation: a variant from another Business is not on this store.
    def test_no_variant_from_other_store_business(
        self, require_part22, client, online_store, published_product, other_variant
    ):
        response = client.post(
            f"/api/v1/stores/{online_store.slug}/cart/",
            {"session_token": "tok_cart_4", "variant": str(other_variant.id), "quantity": 1},
            content_type="application/json",
        )
        assert response.status_code == 400
