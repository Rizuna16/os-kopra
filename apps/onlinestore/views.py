from decimal import Decimal

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.business.models import Business, Location
from apps.customer.models import Customer
from apps.inventory.models import Stock
from apps.onlinestore.models import (
    Cart,
    CartItem,
    OnlineOrder,
    OnlineOrderLine,
    OnlineStore,
    OnlineStoreProduct,
)
from apps.onlinestore.serializers import (
    CartItemCreateSerializer,
    CartItemSerializer,
    CartSerializer,
    OnlineOrderCreateSerializer,
    OnlineOrderLineSerializer,
    OnlineOrderSerializer,
    OnlineStoreCreateSerializer,
    OnlineStoreProductCreateSerializer,
    OnlineStoreProductSerializer,
    OnlineStoreSerializer,
    PublicProductSerializer,
    PublicStoreSerializer,
)
from apps.product.models import Product, Variant
from apps.sales.models import Sale


class OnlineStoreViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _get_business(self, request, business_id):
        return get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )

    def list(self, request, business_id=None):
        business = self._get_business(request, business_id)
        stores = OnlineStore.objects.filter(business=business)
        return Response(OnlineStoreSerializer(stores, many=True).data)

    def create(self, request, business_id=None):
        business = self._get_business(request, business_id)
        serializer = OnlineStoreCreateSerializer(
            data=request.data, context={"business": business, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        store = serializer.save()
        return Response(
            OnlineStoreSerializer(store).data, status=status.HTTP_201_CREATED
        )

    def retrieve(self, request, business_id=None, pk=None):
        business = self._get_business(request, business_id)
        store = get_object_or_404(
            OnlineStore.objects.filter(business=business), pk=pk
        )
        return Response(OnlineStoreSerializer(store).data)

    def partial_update(self, request, business_id=None, pk=None):
        business = self._get_business(request, business_id)
        store = get_object_or_404(
            OnlineStore.objects.filter(business=business), pk=pk
        )
        serializer = OnlineStoreSerializer(
            store, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(OnlineStoreSerializer(store).data)

    def destroy(self, request, business_id=None, pk=None):
        business = self._get_business(request, business_id)
        store = get_object_or_404(
            OnlineStore.objects.filter(business=business), pk=pk
        )
        store.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OnlineStoreProductViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _get_store(self, request, business_id, store_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        return get_object_or_404(
            OnlineStore.objects.filter(business=business), pk=store_id
        )

    def list(self, request, business_id=None, store_id=None):
        store = self._get_store(request, business_id, store_id)
        publishings = OnlineStoreProduct.objects.filter(online_store=store)
        return Response(OnlineStoreProductSerializer(publishings, many=True).data)

    def create(self, request, business_id=None, store_id=None):
        store = self._get_store(request, business_id, store_id)
        serializer = OnlineStoreProductCreateSerializer(
            data=request.data,
            context={"business": store.business, "online_store": store, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        publishing = serializer.save()
        return Response(
            OnlineStoreProductSerializer(publishing).data, status=status.HTTP_201_CREATED
        )

    def partial_update(self, request, business_id=None, store_id=None, pk=None):
        store = self._get_store(request, business_id, store_id)
        publishing = get_object_or_404(
            OnlineStoreProduct.objects.filter(online_store=store),
            product=pk,
        )
        serializer = OnlineStoreProductCreateSerializer(
            publishing, data=request.data, partial=True,
            context={"business": store.business, "online_store": store, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(OnlineStoreProductSerializer(publishing).data)


class PublicStoreView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug=None):
        store = get_object_or_404(
            OnlineStore.objects.filter(is_active=True), slug=slug
        )
        return Response(PublicStoreSerializer(store).data)


class PublicCatalogView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug=None):
        store = get_object_or_404(
            OnlineStore.objects.filter(is_active=True), slug=slug
        )
        products = Product.objects.filter(
            business=store.business,
            online_store_publishings__online_store=store,
            online_store_publishings__is_published=True,
        ).distinct()
        serializer = PublicProductSerializer(
            products, many=True, context={"online_store": store}
        )
        return Response(serializer.data)


class CartView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, slug=None):
        store = get_object_or_404(
            OnlineStore.objects.filter(is_active=True), slug=slug
        )
        serializer = CartItemCreateSerializer(
            data=request.data, context={"online_store": store, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        cart = serializer.save()
        return Response(
            CartSerializer(cart, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def get(self, request, slug=None):
        store = get_object_or_404(
            OnlineStore.objects.filter(is_active=True), slug=slug
        )
        session_token = request.query_params.get("session_token")
        if not session_token:
            return Response({"detail": "session_token is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            cart = Cart.objects.get(online_store=store, session_token=session_token)
        except Cart.DoesNotExist:
            return Response({"detail": "Cart not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CartSerializer(cart, context={"request": request}).data)


class CheckoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, slug=None):
        store = get_object_or_404(
            OnlineStore.objects.filter(is_active=True), slug=slug
        )
        # Ignore client-supplied business_id / online_store (mass-assignment prevention).
        serializer = OnlineOrderCreateSerializer(
            data=request.data,
            context={"online_store": store, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(
            OnlineOrderSerializer(order).data, status=status.HTTP_201_CREATED
        )


class OnlineOrderViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _get_store_by_slug(self, slug):
        return get_object_or_404(OnlineStore.objects.all(), slug=slug)

    def _get_business(self, request, store):
        return get_object_or_404(
            Business.objects.filter(owner=request.user), pk=store.business_id
        )

    def list(self, request, slug=None):
        store = self._get_store_by_slug(slug)
        self._get_business(request, store)
        orders = OnlineOrder.objects.filter(online_store=store)
        return Response(OnlineOrderSerializer(orders, many=True).data)


def _create_sale_for_order(order):
    from apps.sales.serializers import SaleCreateSerializer

    if order.sale is not None:
        return order.sale

    business = order.online_store.business
    default_location = order.online_store.default_location
    customer = order.customer

    lines_data = []
    for oline in order.lines.all():
        lines_data.append({
            "variant": str(oline.variant_id),
            "quantity": str(oline.quantity),
            "unit_price": str(oline.unit_price),
        })

    serializer = SaleCreateSerializer(
        data={
            "location": str(default_location.id),
            "customer": str(customer.id) if customer else None,
            "status": Sale.Status.COMPLETED,
            "lines": lines_data,
        },
        context={"business": business, "request": None},
    )
    serializer.is_valid(raise_exception=True)
    sale = serializer.save()
    order.sale = sale
    order.save(update_fields=["sale"])
    return sale


class OnlineOrderStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_business_and_order(self, request, business_id, order_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        order = get_object_or_404(
            OnlineOrder.objects.filter(online_store__business=business),
            pk=order_id,
        )
        return business, order

    def patch(self, request, business_id, order_id):
        business, order = self._get_business_and_order(request, business_id, order_id)
        new_status = request.data.get("status", None)
        if new_status is None:
            return Response(
                {"detail": "status is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        old_status = order.status

        ALLOWED_TRANSITIONS = {
            OnlineOrder.Status.PENDING: {
                OnlineOrder.Status.CONFIRMED,
                OnlineOrder.Status.CANCELED,
            },
            OnlineOrder.Status.CONFIRMED: {
                OnlineOrder.Status.COMPLETED,
                OnlineOrder.Status.CANCELED,
            },
            OnlineOrder.Status.COMPLETED: set(),
            OnlineOrder.Status.CANCELED: set(),
        }

        if new_status not in ALLOWED_TRANSITIONS.get(old_status, set()):
            return Response(
                {
                    "detail": f"Transition from {old_status} to {new_status} is not allowed."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            order.status = new_status
            order.save(update_fields=["status"])
            if new_status == OnlineOrder.Status.COMPLETED and old_status != OnlineOrder.Status.COMPLETED:
                _create_sale_for_order(order)

        return Response(OnlineOrderSerializer(order).data)
