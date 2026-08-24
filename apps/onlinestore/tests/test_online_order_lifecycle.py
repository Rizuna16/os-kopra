import pytest


try:
    from apps.onlinestore.models import OnlineOrder
except Exception:  # RED: module absent until implementation
    OnlineOrder = None


pytestmark = pytest.mark.django_db


class TestOnlineOrderLifecycle:
    def _mk_order(self, client, online_store, variant, status="PENDING", guest_name="Buyer"):
        response = client.post(
            f"/api/v1/stores/{online_store.slug}/checkout/",
            {
                "guest_name": guest_name,
                "shipping_address": "Addr",
                "lines": [{"variant": str(variant.id), "quantity": 1}],
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        order = OnlineOrder.objects.get(id=response.data["id"])
        if status == "CONFIRMED":
            order.status = "CONFIRMED"
            order.save()
        elif status == "COMPLETED":
            order.status = "CONFIRMED"
            order.save()
            order.status = "COMPLETED"
            order.save()
        elif status == "CANCELED":
            order.status = "CANCELED"
            order.save()
        return order

    def test_pending_to_confirmed_valid(
        self, require_part22, client, online_store, published_product, variant
    ):
        order = self._mk_order(client, online_store, variant, status="CONFIRMED")
        assert order.status == "CONFIRMED"

    def test_pending_to_canceled_valid(
        self, require_part22, client, online_store, published_product, variant
    ):
        order = self._mk_order(client, online_store, variant, status="CANCELED")
        assert order.status == "CANCELED"

    def test_confirmed_to_completed_valid(
        self, require_part22, client, online_store, published_product, variant
    ):
        order = self._mk_order(client, online_store, variant, status="CONFIRMED")
        order.status = "COMPLETED"
        order.save()
        assert order.status == "COMPLETED"

    def test_confirmed_to_canceled_valid(
        self, require_part22, client, online_store, published_product, variant
    ):
        order = self._mk_order(client, online_store, variant, status="CONFIRMED")
        order.status = "CANCELED"
        order.save()
        assert order.status == "CANCELED"

    def test_pending_to_completed_invalid(
        self, require_part22, client, online_store, published_product, variant
    ):
        order = self._mk_order(client, online_store, variant, status="PENDING")
        order.status = "COMPLETED"
        order.save()
        assert order.status != "COMPLETED"

    def test_canceled_to_confirmed_invalid(
        self, require_part22, client, online_store, published_product, variant
    ):
        order = self._mk_order(client, online_store, variant, status="CANCELED")
        order.status = "CONFIRMED"
        order.save()
        assert order.status != "CONFIRMED"

    def test_canceled_to_completed_invalid(
        self, require_part22, client, online_store, published_product, variant
    ):
        order = self._mk_order(client, online_store, variant, status="CANCELED")
        order.status = "COMPLETED"
        order.save()
        assert order.status != "COMPLETED"

    def test_completed_to_canceled_invalid(
        self, require_part22, client, online_store, published_product, variant
    ):
        order = self._mk_order(client, online_store, variant, status="COMPLETED")
        order.status = "CANCELED"
        order.save()
        assert order.status != "CANCELED"

    def test_completed_to_confirmed_invalid(
        self, require_part22, client, online_store, published_product, variant
    ):
        order = self._mk_order(client, online_store, variant, status="COMPLETED")
        order.status = "CONFIRMED"
        order.save()
        assert order.status != "CONFIRMED"

    def test_completed_terminal(
        self, require_part22, client, online_store, published_product, variant
    ):
        order = self._mk_order(client, online_store, variant, status="COMPLETED")
        order.status = "COMPLETED"
        order.save()
        assert order.status == "COMPLETED"

    def test_canceled_terminal(
        self, require_part22, client, online_store, published_product, variant
    ):
        order = self._mk_order(client, online_store, variant, status="CANCELED")
        order.status = "CANCELED"
        order.save()
        assert order.status == "CANCELED"

    def test_cancellation_no_inventory_reversal(
        self, require_part22, client, online_store, published_product, variant, stock
    ):
        order = self._mk_order(client, online_store, variant, status="COMPLETED")
        stock.refresh_from_db()
        before = stock.quantity
        order.status = "CANCELED"
        order.save()
        stock.refresh_from_db()
        assert stock.quantity == before