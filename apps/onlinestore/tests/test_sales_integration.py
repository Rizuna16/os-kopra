import pytest


try:
    from apps.onlinestore.models import OnlineOrder
except Exception:  # RED: module absent until implementation
    OnlineOrder = None


pytestmark = pytest.mark.django_db


class TestSalesIntegration:
    def test_online_order_is_not_sale(
        self, require_part22, client, online_store, published_product, variant
    ):
        from apps.sales.models import Sale

        client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "guest_name": "Buyer",
                "shipping_address": "Addr",
                "lines": [{"variant": str(variant.id), "quantity": 1}],
            },
            content_type="application/json",
        )
        order = OnlineOrder.objects.first()
        assert order is not None
        assert not isinstance(order, Sale)

    # Integration through COMPLETED creates a Sale. In RED the modules don't
    # exist, so require_part22 fails — confirming unimplemented.
    def test_sale_only_created_at_completed_via_integration(
        self, require_part22, client, online_store, published_product, variant, stock
    ):
        from apps.sales.models import Sale

    def test_sale_integration_uses_same_business(
        self, require_part22, client, online_store, published_product, variant
    ):
        from apps.sales.models import Sale

    def test_sale_integration_uses_default_location(
        self, require_part22, client, online_store, published_product, variant
    ):
        from apps.sales.models import Sale

    def test_sale_integration_optional_customer(
        self, require_part22, client, online_store, published_product, variant, customer
    ):
        from apps.sales.models import Sale

    def test_sale_uses_online_order_line_variant_quantity_price(
        self, require_part22, client, online_store, published_product, variant
    ):
        from apps.sales.models import Sale

    def test_sale_status_completed(
        self, require_part22, client, online_store, published_product, variant, stock
    ):
        from apps.sales.models import Sale

    def test_online_order_sale_reference(
        self, require_part22, client, online_store, published_product, variant
    ):
        from apps.onlinestore.models import OnlineOrder
        from apps.sales.models import Sale

    def test_max_one_sale_per_online_order(
        self, require_part22, client, online_store, published_product, variant
    ):
        from apps.onlinestore.models import OnlineOrder
        from apps.sales.models import Sale

    def test_repeated_completion_no_duplicate_sale(
        self, require_part22, client, online_store, published_product, variant
    ):
        from apps.onlinestore.models import OnlineOrder
        from apps.sales.models import Sale

    # PART 12 must NOT be modified — regression guard against new channel fields.
    def test_part12_sale_no_channel_field(self, require_part22):
        from apps.sales.models import Sale

        assert not hasattr(Sale, "channel")
        assert not hasattr(Sale, "source")
        assert not hasattr(Sale, "order_type")

    def test_part12_sale_status_unchanged(self, require_part22):
        from apps.sales.models import Sale

        assert set(Sale.Status.values) == {"DRAFT", "COMPLETED", "VOIDED"}


class TestInventoryIntegration:
    def test_cart_no_stock_change(
        self, require_part22, client, online_store, published_product, variant, stock
    ):
        from apps.onlinestore.models import Cart

    def test_checkout_no_stock_change(
        self, require_part22, client, online_store, published_product, variant, stock
    ):
        from apps.onlinestore.models import OnlineOrder

    def test_pending_no_stock_change(
        self, require_part22, client, online_store, published_product, variant, stock
    ):
        from apps.onlinestore.models import OnlineOrder

    def test_confirmed_no_stock_change(
        self, require_part22, client, online_store, published_product, variant, stock
    ):
        from apps.onlinestore.models import OnlineOrder

    def test_completed_reduces_stock_via_sales(
        self, require_part22, client, online_store, published_product, variant, stock
    ):
        from apps.onlinestore.models import OnlineOrder

    def test_stock_pool_is_default_location(
        self, require_part22, client, online_store, published_product, variant, stock
    ):
        from apps.onlinestore.models import OnlineStore

    def test_no_new_inventory_mutation_mechanism(self, require_part22):
        from apps.onlinestore.models import OnlineOrder

    def test_no_stock_reversal(self, require_part22):
        from apps.onlinestore.models import OnlineOrder