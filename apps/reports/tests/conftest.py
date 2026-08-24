import pytest
from datetime import date
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, Location
from apps.product.models import Product, Variant
from apps.supplier.models import Supplier
from apps.customer.models import Customer
from apps.sales.models import Sale, SaleLine
from apps.purchasing.models import PurchaseOrder, PurchaseOrderLine
from apps.finance.models import Expense, Journal, JournalEntry, Account
from apps.employee.models import Employee

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="reports_owner@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="reports_other@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def auth_tokens(user):
    return {"access": str(RefreshToken.for_user(user).access_token)}


@pytest.fixture
def other_tokens(other_user):
    return {"access": str(RefreshToken.for_user(other_user).access_token)}


@pytest.fixture
def auth_client(client, auth_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {auth_tokens['access']}"
    return client


@pytest.fixture
def other_auth_client(other_tokens):
    from django.test import Client

    c = Client()
    c.defaults["HTTP_AUTHORIZATION"] = f"Bearer {other_tokens['access']}"
    return c


@pytest.fixture
def business(db, user):
    return Business.objects.create(name="Toko Reports", owner=user)


@pytest.fixture
def other_business(db, other_user):
    return Business.objects.create(name="Toko Lain Reports", owner=other_user)


@pytest.fixture
def report_dataset(db, business):
    loc = Location.objects.create(business=business, name="Store A")
    product = Product.objects.create(business=business, name="Baju", price="1000.00")
    variant = Variant.objects.create(product=product, name="M")
    supplier = Supplier.objects.create(business=business, name="Supp A")
    Customer.objects.create(business=business, name="Cust A")
    account = Account.objects.create(business=business, name="Kas", code="K01")

    # Sales: 1 COMPLETED, 1 VOIDED, 1 DRAFT
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

    # Purchasing: 1 CONFIRMED, 1 CANCELLED, 1 DRAFT
    po_c = PurchaseOrder.objects.create(
        business=business, supplier=supplier, location=loc, status=PurchaseOrder.Status.CONFIRMED
    )
    PurchaseOrderLine.objects.create(purchase_order=po_c, variant=variant, quantity="3", unit_price="500.00")
    po_x = PurchaseOrder.objects.create(
        business=business, supplier=supplier, location=loc, status=PurchaseOrder.Status.CANCELLED
    )
    PurchaseOrderLine.objects.create(purchase_order=po_x, variant=variant, quantity="1", unit_price="200.00")
    po_d = PurchaseOrder.objects.create(
        business=business, supplier=supplier, location=loc, status=PurchaseOrder.Status.DRAFT
    )
    PurchaseOrderLine.objects.create(purchase_order=po_d, variant=variant, quantity="1", unit_price="200.00")

    # Finance: 1 Expense, 3 Journals (POSTED/DRAFT/REVERSED) with entries
    Expense.objects.create(business=business, account=account, description="Listrik", amount="300.00")
    j_posted = Journal.objects.create(business=business, reference="J1", status=Journal.Status.POSTED)
    JournalEntry.objects.create(
        journal=j_posted, account=account, entry_type=JournalEntry.EntryType.DEBIT, amount="1000.00"
    )
    JournalEntry.objects.create(
        journal=j_posted, account=account, entry_type=JournalEntry.EntryType.CREDIT, amount="500.00"
    )
    j_draft = Journal.objects.create(business=business, reference="J2", status=Journal.Status.DRAFT)
    JournalEntry.objects.create(
        journal=j_draft, account=account, entry_type=JournalEntry.EntryType.DEBIT, amount="200.00"
    )
    j_rev = Journal.objects.create(business=business, reference="J3", status=Journal.Status.REVERSED)
    JournalEntry.objects.create(
        journal=j_rev, account=account, entry_type=JournalEntry.EntryType.CREDIT, amount="100.00"
    )

    # Employees: 1 active, 1 inactive
    Employee.objects.create(business=business, name="E1", active=True)
    Employee.objects.create(business=business, name="E2", active=False)

    return {"sale_date": date.today()}
