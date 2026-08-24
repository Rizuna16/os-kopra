import decimal
import uuid

import pytest
from django.contrib.auth import get_user_model

from apps.business.models import Business, Location
from apps.customer.models import Customer
from apps.inventory.models import Stock
from apps.product.models import Product, Variant
from apps.promotion_loyalty.models import Promotion

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="owner@example.com", password="SecurePass123!"
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="other@example.com", password="SecurePass123!"
    )


@pytest.fixture
def auth_tokens(user):
    from rest_framework_simplejwt.tokens import RefreshToken

    return {"access": str(RefreshToken.for_user(user).access_token)}


@pytest.fixture
def auth_client(client, auth_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {auth_tokens['access']}"
    return client


@pytest.fixture
def business(db, user):
    return Business.objects.create(name="Toko Budi", owner=user)


@pytest.fixture
def other_business(db, other_user):
    return Business.objects.create(name="Toko Lain", owner=other_user)


@pytest.fixture
def location(db, business):
    return Location.objects.create(business=business, name="Cabang Dago")


@pytest.fixture
def product(db, business):
    return Product.objects.create(business=business, name="Sepatu Nike", price="100000")


@pytest.fixture
def variant(db, business, product):
    return Variant.objects.create(product=product, name="Hitam - 40")


@pytest.fixture
def customer(db, business):
    return Customer.objects.create(business=business, name="Budi")


@pytest.fixture
def other_customer(db, other_business):
    return Customer.objects.create(business=other_business, name="Orang Lain")


@pytest.fixture
def stock(business, location, variant):
    return Stock.objects.create(location=location, variant=variant, quantity=20)


@pytest.fixture
def line_payload(variant):
    def _build(variant_id=None, quantity="2", unit_price="50000"):
        return {
            "variant": str(variant_id if variant_id else variant.id),
            "quantity": quantity,
            "unit_price": unit_price,
        }

    return _build


@pytest.fixture
def sale_payload(location):
    def _build(location_id=None, status=None, lines=None, customer=None,
               line_extras=None):
        payload = {"location": str(location_id if location_id else location.id)}
        if status:
            payload["status"] = status
        if customer is not None:
            payload["customer"] = str(customer.id)
        if lines is not None:
            payload["lines"] = lines
        if line_extras is not None:
            payload["lines"] = [dict(lines[0], **line_extras)]
        return payload

    return _build


def _url(business_id, suffix=""):
    return f"/api/v1/businesses/{business_id}/sales/{suffix}"


@pytest.mark.django_db
class TestSaleAmendmentCustomer:
    def test_sale_customer_nullable(self, auth_client, business, location, variant,
                                   line_payload, sale_payload):
        r = auth_client.post(
            _url(business.id),
            sale_payload(location_id=location.id, lines=[line_payload()]),
            content_type="application/json",
        )
        assert r.status_code == 201
        sale_id = r.data["id"]
        detail = auth_client.get(_url(business.id, f"{sale_id}/"))
        assert "customer" in detail.data
        assert detail.data["customer"] is None

    def test_sale_customer_same_business_accepted(self, auth_client, business,
                                                 location, variant, customer,
                                                 line_payload, sale_payload):
        r = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id, customer=customer, lines=[line_payload()]
            ),
            content_type="application/json",
        )
        assert r.status_code == 201
        assert r.data["customer"] == str(customer.id)

    def test_sale_customer_cross_business_rejected(self, auth_client, business,
                                                   location, variant, other_customer,
                                                   line_payload, sale_payload):
        r = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id, customer=other_customer,
                lines=[line_payload()],
            ),
            content_type="application/json",
        )
        assert r.status_code == 400


@pytest.mark.django_db
class TestSaleAmendmentLoyaltyEarned:
    def test_loyalty_earned_default_zero(self, auth_client, business, location,
                                        variant, line_payload, sale_payload):
        r = auth_client.post(
            _url(business.id),
            sale_payload(location_id=location.id, lines=[line_payload()]),
            content_type="application/json",
        )
        assert r.status_code == 201
        sale_id = r.data["id"]
        detail = auth_client.get(_url(business.id, f"{sale_id}/"))
        assert "loyalty_earned" in detail.data
        assert decimal.Decimal(str(detail.data["loyalty_earned"])) == decimal.Decimal("0")

    def test_loyalty_earned_zero_when_customer_null(self, auth_client, business,
                                                    location, variant, line_payload,
                                                    sale_payload):
        r = auth_client.post(
            _url(business.id),
            sale_payload(location_id=location.id, lines=[line_payload()]),
            content_type="application/json",
        )
        assert r.status_code == 201
        detail = auth_client.get(_url(business.id, f"{r.data['id']}/"))
        assert "loyalty_earned" in detail.data
        assert decimal.Decimal(str(detail.data["loyalty_earned"])) == decimal.Decimal("0")


@pytest.mark.django_db
class TestSaleLineAmendmentPromotion:
    def test_saleline_applied_promotion_nullable(self, auth_client, business,
                                                location, variant, line_payload,
                                                sale_payload):
        r = auth_client.post(
            _url(business.id),
            sale_payload(location_id=location.id, lines=[line_payload()]),
            content_type="application/json",
        )
        assert r.status_code == 201
        sale_id = r.data["id"]
        detail = auth_client.get(_url(business.id, f"{sale_id}/"))
        line = detail.data["lines"][0]
        assert "applied_promotion" in line

    def test_saleline_applied_discount_type_present(self, auth_client, business,
                                                   location, variant, line_payload,
                                                   sale_payload):
        r = auth_client.post(
            _url(business.id),
            sale_payload(location_id=location.id, lines=[line_payload()]),
            content_type="application/json",
        )
        assert r.status_code == 201
        detail = auth_client.get(_url(business.id, f"{r.data['id']}/"))
        line = detail.data["lines"][0]
        assert "applied_discount_type" in line

    def test_saleline_applied_discount_value_present(self, auth_client, business,
                                                    location, variant, line_payload,
                                                    sale_payload):
        r = auth_client.post(
            _url(business.id),
            sale_payload(location_id=location.id, lines=[line_payload()]),
            content_type="application/json",
        )
        assert r.status_code == 201
        detail = auth_client.get(_url(business.id, f"{r.data['id']}/"))
        line = detail.data["lines"][0]
        assert "applied_discount_value" in line

    def test_promotion_cross_business_rejected(self, auth_client, business,
                                              location, variant, line_payload,
                                              sale_payload):
        r = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id,
                lines=[line_payload()],
                line_extras={"applied_promotion": str(uuid.uuid4())},
            ),
            content_type="application/json",
        )
        assert r.status_code == 400

    def test_completed_persists_promotion_snapshot(self, auth_client, business,
                                                  location, variant, line_payload,
                                                  sale_payload):
        promotion = Promotion.objects.create(
            business=business,
            name="Snapshot Promo",
            discount_type="PERCENTAGE",
            discount_value="10",
            valid_from="2026-01-01T00:00:00Z",
            valid_to="2026-12-31T23:59:59Z",
            status="ACTIVE",
            applicability="BUSINESS_WIDE",
        )
        r = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id,
                status="COMPLETED",
                lines=[line_payload()],
                line_extras={
                    "applied_promotion": str(promotion.id),
                    "applied_discount_type": "PERCENTAGE",
                    "applied_discount_value": "10",
                },
            ),
            content_type="application/json",
        )
        assert r.status_code == 201
        detail = auth_client.get(_url(business.id, f"{r.data['id']}/"))
        line = detail.data["lines"][0]
        assert line["applied_discount_type"] == "PERCENTAGE"
        assert str(line["applied_discount_value"]) == "10.00"


@pytest.mark.django_db
class TestSaleAmendmentNoEarningFormula:
    def test_no_loyalty_formula_invented(self, auth_client, business, location,
                                         variant, customer, line_payload, sale_payload):
        # Only snapshot behavior is contractually defined; earning formula is a GAP.
        r = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id, customer=customer, lines=[line_payload()]
            ),
            content_type="application/json",
        )
        assert r.status_code == 201
        detail = auth_client.get(_url(business.id, f"{r.data['id']}/"))
        assert "loyalty_earned" in detail.data
        # Field exists as a snapshot container; no computed value is asserted.
        assert decimal.Decimal(str(detail.data["loyalty_earned"])) >= decimal.Decimal("0")


@pytest.mark.django_db
class TestSaleAmendmentRegression:
    def test_existing_draft_behavior_intact(self, auth_client, business, location,
                                           variant, line_payload, sale_payload):
        r = auth_client.post(
            _url(business.id),
            sale_payload(location_id=location.id, lines=[line_payload()]),
            content_type="application/json",
        )
        assert r.status_code == 201
        assert r.data["status"] == "DRAFT"

    def test_existing_completed_reduces_stock(self, auth_client, business, location,
                                             variant, line_payload, sale_payload,
                                             stock):
        assert decimal.Decimal(stock.quantity) == decimal.Decimal("20")
        r = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id, status="COMPLETED",
                lines=[line_payload(quantity="5", unit_price="9000")],
            ),
            content_type="application/json",
        )
        assert r.status_code == 201
        stock.refresh_from_db()
        assert decimal.Decimal(stock.quantity) == decimal.Decimal("15")

    def test_existing_completed_to_voided_blocked(self, auth_client, business,
                                                 location, variant, line_payload,
                                                 sale_payload, stock):
        r = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id, status="COMPLETED",
                lines=[line_payload(quantity="5", unit_price="1")],
            ),
            content_type="application/json",
        )
        assert r.status_code == 201
        sale_id = r.data["id"]
        stock.refresh_from_db()
        assert decimal.Decimal(stock.quantity) == decimal.Decimal("15")
        rr = auth_client.patch(
            _url(business.id, f"{sale_id}/"),
            {"status": "VOIDED"},
            content_type="application/json",
        )
        assert rr.status_code == 400
        stock.refresh_from_db()
        assert decimal.Decimal(stock.quantity) == decimal.Decimal("15")


def _make_promotion(business, discount_type="PERCENTAGE", discount_value="10",
                    applicability="BUSINESS_WIDE"):
    return Promotion.objects.create(
        business=business,
        name="Timing Promo",
        discount_type=discount_type,
        discount_value=decimal.Decimal(discount_value),
        valid_from="2026-01-01T00:00:00Z",
        valid_to="2026-12-31T23:59:59Z",
        status="ACTIVE",
        applicability=applicability,
    )


@pytest.mark.django_db
class TestPromotionSnapshotTiming:
    def test_a_draft_does_not_snapshot(self, auth_client, business, location,
                                       variant, line_payload, sale_payload):
        promo = _make_promotion(business, "PERCENTAGE", "10")
        r = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id,
                lines=[line_payload()],
                line_extras={"applied_promotion": str(promo.id)},
            ),
            content_type="application/json",
        )
        assert r.status_code == 201
        detail = auth_client.get(_url(business.id, f"{r.data['id']}/"))
        line = detail.data["lines"][0]
        # FK stored, but discount snapshot must NOT be applied while DRAFT.
        assert line["applied_promotion"] == str(promo.id)
        assert line["applied_discount_type"] is None
        assert line["applied_discount_value"] is None

    def test_b_draft_to_completed_snapshots_current(self, auth_client, business,
                                                   location, variant, line_payload,
                                                   sale_payload):
        promo = _make_promotion(business, "PERCENTAGE", "10")
        r = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id,
                lines=[line_payload()],
                line_extras={"applied_promotion": str(promo.id)},
            ),
            content_type="application/json",
        )
        assert r.status_code == 201
        sale_id = r.data["id"]
        rr = auth_client.patch(
            _url(business.id, f"{sale_id}/"),
            {"status": "COMPLETED"},
            content_type="application/json",
        )
        assert rr.status_code == 200
        detail = auth_client.get(_url(business.id, f"{sale_id}/"))
        line = detail.data["lines"][0]
        assert line["applied_discount_type"] == "PERCENTAGE"
        assert str(line["applied_discount_value"]) == "10.00"

    def test_c_promotion_change_after_draft_uses_new_values(self, auth_client, business,
                                                           location, variant,
                                                           line_payload, sale_payload):
        promo = _make_promotion(business, "PERCENTAGE", "10")
        r = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id,
                lines=[line_payload()],
                line_extras={"applied_promotion": str(promo.id)},
            ),
            content_type="application/json",
        )
        assert r.status_code == 201
        sale_id = r.data["id"]
        # Promotion changes BEFORE completion.
        promo.discount_value = decimal.Decimal("20")
        promo.save()
        rr = auth_client.patch(
            _url(business.id, f"{sale_id}/"),
            {"status": "COMPLETED"},
            content_type="application/json",
        )
        assert rr.status_code == 200
        detail = auth_client.get(_url(business.id, f"{sale_id}/"))
        line = detail.data["lines"][0]
        # Snapshot must reflect CURRENT promotion values at COMPLETED.
        assert line["applied_discount_type"] == "PERCENTAGE"
        assert str(line["applied_discount_value"]) == "20.00"

    def test_d_direct_completed_creation_snapshots(self, auth_client, business,
                                                  location, variant, line_payload,
                                                  sale_payload):
        promo = _make_promotion(business, "FIXED", "5")
        r = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id,
                status="COMPLETED",
                lines=[line_payload()],
                line_extras={"applied_promotion": str(promo.id)},
            ),
            content_type="application/json",
        )
        assert r.status_code == 201
        detail = auth_client.get(_url(business.id, f"{r.data['id']}/"))
        line = detail.data["lines"][0]
        assert line["applied_discount_type"] == "FIXED"
        assert str(line["applied_discount_value"]) == "5.00"

    def test_e_draft_without_promotion_no_snapshot(self, auth_client, business,
                                                  location, variant, line_payload,
                                                  sale_payload):
        r = auth_client.post(
            _url(business.id),
            sale_payload(location_id=location.id, lines=[line_payload()]),
            content_type="application/json",
        )
        assert r.status_code == 201
        detail = auth_client.get(_url(business.id, f"{r.data['id']}/"))
        line = detail.data["lines"][0]
        assert line["applied_promotion"] is None
        assert line["applied_discount_type"] is None
        assert line["applied_discount_value"] is None

    def test_f_cleared_promotion_while_draft_leaves_no_snapshot(
        self, auth_client, business, location, variant, line_payload, sale_payload
    ):
        promo = _make_promotion(business, "PERCENTAGE", "10")
        r = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id,
                lines=[line_payload()],
                line_extras={"applied_promotion": str(promo.id)},
            ),
            content_type="application/json",
        )
        assert r.status_code == 201
        sale_id = r.data["id"]
        # Replace lines removing the promotion while still DRAFT.
        rr = auth_client.patch(
            _url(business.id, f"{sale_id}/"),
            {
                "lines": [line_payload()],
            },
            content_type="application/json",
        )
        assert rr.status_code == 200
        rr2 = auth_client.patch(
            _url(business.id, f"{sale_id}/"),
            {"status": "COMPLETED"},
            content_type="application/json",
        )
        assert rr2.status_code == 200
        detail = auth_client.get(_url(business.id, f"{sale_id}/"))
        line = detail.data["lines"][0]
        assert line["applied_discount_type"] is None
        assert line["applied_discount_value"] is None

    def test_g_existing_completed_reduces_stock_with_promotion(
        self, auth_client, business, location, variant, line_payload, sale_payload, stock
    ):
        promo = _make_promotion(business, "PERCENTAGE", "10")
        assert decimal.Decimal(stock.quantity) == decimal.Decimal("20")
        r = auth_client.post(
            _url(business.id),
            sale_payload(
                location_id=location.id,
                status="COMPLETED",
                lines=[line_payload(quantity="5", unit_price="9000")],
                line_extras={"applied_promotion": str(promo.id)},
            ),
            content_type="application/json",
        )
        assert r.status_code == 201
        stock.refresh_from_db()
        assert decimal.Decimal(stock.quantity) == decimal.Decimal("15")
        detail = auth_client.get(_url(business.id, f"{r.data['id']}/"))
        line = detail.data["lines"][0]
        assert line["applied_discount_type"] == "PERCENTAGE"
        assert str(line["applied_discount_value"]) == "10.00"
