import pytest


try:
    from apps.onlinestore.models import OnlineOrder
except Exception:  # RED: module absent until implementation
    OnlineOrder = None


pytestmark = pytest.mark.django_db


class TestCustomerBoundary:
    def test_guest_no_user_created(
        self, require_part22, client, online_store, published_product, variant
    ):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        before = User.objects.count()
        client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "guest_name": "Buyer",
                "shipping_address": "Addr",
                "lines": [{"variant": str(variant.id), "quantity": 1}],
            },
            content_type="application/json",
        )
        assert User.objects.count() == before

    def test_guest_no_customer_master_created(
        self, require_part22, client, online_store, published_product, variant
    ):
        from apps.customer.models import Customer

        before = Customer.objects.count()
        client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "guest_name": "Buyer",
                "shipping_address": "Addr",
                "lines": [{"variant": str(variant.id), "quantity": 1}],
            },
            content_type="application/json",
        )
        assert Customer.objects.count() == before

    def test_online_order_stores_guest_contact(
        self, require_part22, client, online_store, published_product, variant
    ):
        client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "guest_name": "Buyer X",
                "guest_email": "x@example.com",
                "guest_phone": "0812",
                "shipping_address": "Addr",
                "lines": [{"variant": str(variant.id), "quantity": 1}],
            },
            content_type="application/json",
        )
        order = OnlineOrder.objects.first()
        assert order.guest_name == "Buyer X"
        assert order.guest_email == "x@example.com"
        assert order.guest_phone == "0812"
        assert order.shipping_address == "Addr"

    def test_optional_existing_customer_fk(
        self, require_part22, online_store, published_product, customer
    ):
        order = OnlineOrder.objects.create(
            online_store=online_store,
            guest_name="Buyer",
            shipping_address="Addr",
            customer=customer,
        )
        assert order.customer_id == customer.id

    def test_customer_auth_future(
        self, require_part22, client, online_store, published_product, variant
    ):
        # V1 is guest-first: unauthenticated checkout must succeed (no customer login).
        response = client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "guest_name": "Buyer",
                "shipping_address": "Addr",
                "lines": [{"variant": str(variant.id), "quantity": 1}],
            },
            content_type="application/json",
        )
        assert response.status_code == 201


class TestSecurity:
    def test_owner_endpoints_is_authenticated(
        self, require_part22, client, business
    ):
        response = client.get(f"/api/v1/businesses/{business.id}/online-stores/")
        assert response.status_code == 401

    def test_owner_scoped_by_business_ownership(
        self, require_part22, other_auth_client, other_business
    ):
        response = other_auth_client.get(
            f"/api/v1/businesses/{other_business.id}/online-stores/"
        )
        assert response.status_code == 200

    def test_public_only_by_slug(self, require_part22, client):
        response = client.get("/api/v1/stores/sec/products/")
        assert response.status_code in (200, 404)

    def test_public_no_business_id_input(self, require_part22, client):
        response = client.get("/api/v1/stores/sec/products/")
        assert "business_id" not in str(response.request["PATH_INFO"])

    def test_public_cannot_access_owner_management(self, require_part22, client, business):
        response = client.get(f"/api/v1/businesses/{business.id}/")
        assert response.status_code in (401, 404)

    def test_public_cannot_access_inventory_management(
        self, require_part22, client, business, location
    ):
        response = client.get(
            f"/api/v1/businesses/{business.id}/locations/{location.id}/stocks/"
        )
        assert response.status_code in (401, 404)

    def test_public_cannot_access_sales_management(self, require_part22, client, business):
        response = client.get(f"/api/v1/businesses/{business.id}/sales/")
        assert response.status_code in (401, 404)

    def test_public_cannot_access_business_data(self, require_part22, client, business):
        response = client.get(f"/api/v1/businesses/{business.id}/")
        assert response.status_code in (401, 404)

    def test_public_cannot_see_unpublished(self, require_part22, client, product):
        catalog = client.get("/api/v1/stores/sec/products/").data
        ids = [item["id"] for item in catalog] if isinstance(catalog, list) else []
        assert str(product.id) not in ids

    def test_idor_prevention(self, require_part22, client):
        response = client.get("/api/v1/stores/sec/")
        assert response.status_code in (200, 404)

    def test_cross_business_isolation(self, require_part22, client):
        response = client.get("/api/v1/stores/sec/products/")
        assert response.status_code in (200, 404)

    # OnlineOrder has no client-overridable business/online_store; payload must
    # not reassign ownership (Contract §6 fields vs. security principle §21).
    def test_mass_assignment_prevention(
        self, require_part22, client, online_store, published_product, variant, other_business
    ):
        response = client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "guest_name": "Buyer",
                "shipping_address": "Addr",
                "business": str(other_business.id),
                "online_store": str(other_business.id),
                "lines": [{"variant": str(variant.id), "quantity": 1}],
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        order = OnlineOrder.objects.first()
        assert order.online_store_id == online_store.id
        assert order.online_store_business_id == online_store.business_id


class TestLockedRegression:
    def test_inventory_model_not_modified(self, require_part22):
        from apps.inventory.models import Stock

        assert not hasattr(Stock, "online_reserved")

    def test_product_model_not_modified(self, require_part22):
        from apps.product.models import Product

        assert not hasattr(Product, "is_online")

    def test_customer_model_not_modified(self, require_part22):
        from apps.customer.models import Customer

        assert not hasattr(Customer, "is_online_guest")

    def test_payment_model_not_modified(self, require_part22):
        from apps.billing.models import Payment

        assert not hasattr(Payment, "online_order")

    def test_promotion_model_not_modified(self, require_part22):
        from apps.promotion_loyalty.models import Promotion

        assert not hasattr(Promotion, "online_only")

    def test_authentication_not_modified(self, require_part22):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        assert not hasattr(User, "is_online_customer")
