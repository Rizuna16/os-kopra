import pytest
from decimal import Decimal
from datetime import date

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, Location
from apps.customer.models import Customer
from apps.finance.models import Expense, Account
from apps.product.models import Product, Variant
from apps.sales.models import Sale, SaleLine
from apps.sales.serializers import SaleCreateSerializer, SaleUpdateSerializer

User = get_user_model()


def _url(business_id, suffix=""):
    return f"/api/v1/businesses/{business_id}/reports/{suffix}"


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="profit_owner@example.com",
        password="ProfitPass123!",
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="profit_other@example.com",
        password="ProfitPass123!",
    )


@pytest.fixture
def auth_tokens(user):
    return {"access": str(RefreshToken.for_user(user).access_token)}


@pytest.fixture
def auth_client(client, auth_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {auth_tokens['access']}"
    return client


@pytest.fixture
def business(db, user):
    return Business.objects.create(name="Profit Test Business", owner=user)


@pytest.fixture
def other_business(db, other_user):
    return Business.objects.create(name="Profit Other Business", owner=other_user)


@pytest.fixture
def report_dataset(db, business):
    loc = Location.objects.create(business=business, name="Store A")
    product = Product.objects.create(business=business, name="Baju", price="1000.00")
    variant = Variant.objects.create(product=product, name="M")

    sale_c = Sale.objects.create(
        business=business, location=loc, status=Sale.Status.COMPLETED, loyalty_earned="50.00"
    )
    SaleLine.objects.create(sale=sale_c, variant=variant, quantity="2", unit_price="1000.00")

    sale_v = Sale.objects.create(
        business=business, location=loc, status=Sale.Status.VOIDED, loyalty_earned="0.00"
    )
    SaleLine.objects.create(sale=sale_v, variant=variant, quantity="1", unit_price="500.00")

    sale_d = Sale.objects.create(
        business=business, location=loc, status=Sale.Status.DRAFT, loyalty_earned="0.00"
    )
    SaleLine.objects.create(sale=sale_d, variant=variant, quantity="1", unit_price="500.00")

    account = Account.objects.create(business=business, name="Kas", code="K01")
    Expense.objects.create(business=business, account=account, description="Listrik", amount="300.00")

    return {"sale_date": date.today(), "variant": variant, "location": loc}


# ============================================================
# GAP-01: Profit Estimation — RED PHASE (Asserting missing attributes/fields)
# ============================================================

@pytest.mark.django_db
class TestGAP01ProfitRed:
    # 1. Variant model cost_price field
    def test_variant_cost_price_field_exists(self, business):
        product = Product.objects.create(business=business, name="Baju", price="1000.00")
        variant = Variant.objects.create(product=product, name="M", cost_price=Decimal("600.00"))
        assert hasattr(variant, "cost_price")
        assert variant.cost_price == Decimal("600.00")

    # 2. SaleLine model applied_cost_price field
    def test_sale_line_applied_cost_price_field_exists(self, business, report_dataset):
        variant = report_dataset["variant"]
        sale = Sale.objects.filter(business=business, status=Sale.Status.COMPLETED).first()
        line = sale.lines.first()
        assert hasattr(line, "applied_cost_price")

    # 3. Snapshot of Variant.cost_price to SaleLine.applied_cost_price upon COMPLETED
    def test_sale_completion_snapshots_variant_cost_price(self, auth_client, business, report_dataset):
        product = Product.objects.create(business=business, name="Celana", price="2000.00")
        variant = Variant.objects.create(product=product, name="L", cost_price=Decimal("1200.00"))
        loc = report_dataset["location"]

        sale = Sale.objects.create(business=business, location=loc, status=Sale.Status.DRAFT)
        line = SaleLine.objects.create(sale=sale, variant=variant, quantity="1", unit_price="2000.00")

        # Update status to COMPLETED using serializer
        serializer = SaleUpdateSerializer(instance=sale, data={"status": Sale.Status.COMPLETED}, partial=True)
        assert serializer.is_valid(), serializer.errors
        serializer.save()

        line.refresh_from_reload() if hasattr(line, "refresh_from_reload") else line.refresh_from_db()
        assert line.applied_cost_price == Decimal("1200.00")

    # 4. Reports overview response includes gross_profit and net_profit
    def test_overview_report_includes_profit_metrics(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "overview/"))
        assert r.status_code == 200
        assert "cogs" in r.data["sales"]
        assert "gross_profit" in r.data["sales"]
        assert "net_profit" in r.data["finance"]

    # 5. Sales report response includes cogs and gross_profit
    def test_sales_report_includes_cogs_and_gross_profit(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "sales/"))
        assert r.status_code == 200
        assert "cogs" in r.data
        assert "gross_profit" in r.data

    # 6. Finance report response includes net_profit
    def test_finance_report_includes_net_profit(self, auth_client, business, report_dataset):
        r = auth_client.get(_url(business.id, "finance/"))
        assert r.status_code == 200
        assert "net_profit" in r.data
