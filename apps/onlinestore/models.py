import uuid

from django.db import models

from apps.business.models import Business, Location
from apps.customer.models import Customer
from apps.product.models import Product, Variant


class OnlineStore(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="online_stores",
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    default_location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name="online_store_default",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "OnlineStore"
        verbose_name_plural = "OnlineStores"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.slug})"


class OnlineStoreProduct(models.Model):
    online_store = models.ForeignKey(
        OnlineStore,
        on_delete=models.CASCADE,
        related_name="published_products",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="online_store_publishings",
    )
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "OnlineStoreProduct"
        verbose_name_plural = "OnlineStoreProducts"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["online_store", "product"],
                name="unique_online_store_product",
            )
        ]

    def __str__(self):
        return f"{self.online_store.name} - {self.product.name}"


class Cart(models.Model):
    online_store = models.ForeignKey(
        OnlineStore,
        on_delete=models.CASCADE,
        related_name="carts",
    )
    session_token = models.CharField(max_length=255, unique=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="carts",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cart"
        verbose_name_plural = "Carts"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Cart {self.session_token}"

    @property
    def online_store_business_id(self):
        return self.online_store.business_id


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items",
    )
    variant = models.ForeignKey(
        Variant,
        on_delete=models.CASCADE,
        related_name="cart_items",
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "CartItem"
        verbose_name_plural = "CartItems"

    def __str__(self):
        return f"{self.variant.name} x {self.quantity}"


class OnlineOrder(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        COMPLETED = "COMPLETED", "Completed"
        CANCELED = "CANCELED", "Canceled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    online_store = models.ForeignKey(
        OnlineStore,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    sale = models.ForeignKey(
        "sales.Sale",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="online_orders",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    guest_name = models.CharField(max_length=255)
    guest_email = models.EmailField(max_length=254, blank=True)
    guest_phone = models.CharField(max_length=50, blank=True)
    shipping_address = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "OnlineOrder"
        verbose_name_plural = "OnlineOrders"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["online_store"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"Order {self.id} ({self.status})"

    @property
    def online_store_business_id(self):
        return self.online_store.business_id

    _ALLOWED_TRANSITIONS = {
        Status.PENDING: {Status.PENDING, Status.CONFIRMED, Status.CANCELED},
        Status.CONFIRMED: {Status.CONFIRMED, Status.COMPLETED, Status.CANCELED},
        Status.COMPLETED: {Status.COMPLETED},
        Status.CANCELED: {Status.CANCELED},
    }

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        status_being_saved = update_fields is None or "status" in update_fields

        if not self._state.adding and status_being_saved:
            try:
                old = OnlineOrder.objects.get(pk=self.pk)
            except OnlineOrder.DoesNotExist:
                old = None
        else:
            old = None

        if old is not None and old.status != self.status:
            allowed = self._ALLOWED_TRANSITIONS.get(old.status, {old.status})
            if self.status not in allowed:
                self.status = old.status

        creating_sale = (
            old is not None
            and old.status != OnlineOrder.Status.COMPLETED
            and self.status == OnlineOrder.Status.COMPLETED
            and self.sale_id is None
        )

        result = super().save(*args, **kwargs)

        if creating_sale:
            from apps.onlinestore.views import _create_sale_for_order
            sale = _create_sale_for_order(self)
            if update_fields is not None and "sale" not in update_fields:
                super().save(update_fields=list(update_fields) + ["sale"])

        return result


class OnlineOrderLine(models.Model):
    online_order = models.ForeignKey(
        OnlineOrder,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    variant = models.ForeignKey(
        Variant,
        on_delete=models.CASCADE,
        related_name="order_lines",
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "OnlineOrderLine"
        verbose_name_plural = "OnlineOrderLines"

    def __str__(self):
        return f"{self.variant.name} x {self.quantity}"