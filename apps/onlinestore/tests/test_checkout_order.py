import pytest


try:
    from apps.onlinestore.models import OnlineOrder
except Exception:  # RED: module absent until implementation
    OnlineOrder = None


pytestmark = pytest.mark.django_db


class TestCheckoutOnlineOrder:
    def test_guest_checkout_without_user(
        self, require_part22, client, online_store, published_product, variant
    ):
        response = client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "guest_name": "Buyer A",
                "guest_email": "buyer@example.com",
                "guest_phone": "0812345678",
                "shipping_address": "Jl. Dago 10",
                "lines": [{"variant": str(variant.id), "quantity": 1}],
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["status"] == "PENDING"

    def test_guest_no_customer_master_created(
        self, require_part22, client, online_store, published_product, variant
    ):
        from apps.customer.models import Customer

        before = Customer.objects.count()
        client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "guest_name": "Buyer A",
                "shipping_address": "Jl. Dago",
                "lines": [{"variant": str(variant.id), "quantity": 1}],
            },
            content_type="application/json",
        )
        assert Customer.objects.count() == before

    def test_guest_no_user_created(
        self, require_part22, client, online_store, published_product, variant
    ):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        before = User.objects.count()
        client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "guest_name": "Buyer A",
                "shipping_address": "Jl. Dago",
                "lines": [{"variant": str(variant.id), "quantity": 1}],
            },
            content_type="application/json",
        )
        assert User.objects.count() == before

    def test_guest_name_required(
        self, require_part22, client, online_store, published_product, variant
    ):
        response = client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "shipping_address": "Jl. Dago",
                "lines": [{"variant": str(variant.id), "quantity": 1}],
            },
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_guest_email_optional(
        self, require_part22, client, online_store, published_product, variant
    ):
        response = client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "guest_name": "Buyer A",
                "shipping_address": "Jl. Dago",
                "lines": [{"variant": str(variant.id), "quantity": 1}],
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        assert "guest_email" in response.data

    def test_guest_phone_optional(
        self, require_part22, client, online_store, published_product, variant
    ):
        response = client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "guest_name": "Buyer A",
                "shipping_address": "Jl. Dago",
                "lines": [{"variant": str(variant.id), "quantity": 1}],
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        assert "guest_phone" in response.data

    def test_shipping_address_snapshot(
        self, require_part22, client, online_store, published_product, variant
    ):
        response = client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "guest_name": "Buyer A",
                "shipping_address": "Jl. Dago 20",
                "lines": [{"variant": str(variant.id), "quantity": 1}],
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["shipping_address"] == "Jl. Dago 20"

    def test_checkout_produces_pending(
        self, require_part22, client, online_store, published_product, variant
    ):
        client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "guest_name": "Buyer A",
                "shipping_address": "Jl. Dago",
                "lines": [{"variant": str(variant.id), "quantity": 1}],
            },
            content_type="application/json",
        )
        assert OnlineOrder.objects.filter(status="PENDING").exists()

    def test_checkout_does_not_deduct_inventory(
        self, require_part22, client, online_store, published_product, variant, stock
    ):
        before = stock.quantity
        client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "guest_name": "Buyer A",
                "shipping_address": "Jl. Dago",
                "lines": [{"variant": str(variant.id), "quantity": 2}],
            },
            content_type="application/json",
        )
        stock.refresh_from_db()
        assert stock.quantity == before

    def test_checkout_does_not_create_sale(
        self, require_part22, client, online_store, published_product, variant
    ):
        from apps.sales.models import Sale

        before = Sale.objects.count()
        client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "guest_name": "Buyer A",
                "shipping_address": "Jl. Dago",
                "lines": [{"variant": str(variant.id), "quantity": 1}],
            },
            content_type="application/json",
        )
        assert Sale.objects.count() == before

    def test_v1_no_payment_step(
        self, require_part22, client, online_store, published_product, variant
    ):
        response = client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "guest_name": "Buyer A",
                "shipping_address": "Jl. Dago",
                "lines": [{"variant": str(variant.id), "quantity": 1}],
            },
            content_type="application/json",
        )
        assert "payment" not in [k.lower() for k in response.data.keys()]
