from datetime import datetime, time
from decimal import Decimal
from django.db.models import Count, F, Sum
from django.utils import timezone

from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.customer.models import Customer
from apps.employee.models import Employee
from apps.finance.models import Expense, Journal, JournalEntry
from apps.product.models import Product, Variant
from apps.purchasing.models import PurchaseOrder, PurchaseOrderLine
from apps.sales.models import Sale, SaleLine
from apps.authentication.permissions import BusinessAccessMixin


def parse_date_params(request):
    raw_from = request.query_params.get("date_from")
    raw_to = request.query_params.get("date_to")
    dt_from = None
    dt_to = None
    tz = timezone.get_current_timezone()
    if raw_from:
        try:
            d = datetime.strptime(raw_from, "%Y-%m-%d").date()
        except ValueError:
            raise ValidationError("Invalid date_from. Expected YYYY-MM-DD.")
        dt_from = datetime.combine(d, time.min, tzinfo=tz)
    if raw_to:
        try:
            d = datetime.strptime(raw_to, "%Y-%m-%d").date()
        except ValueError:
            raise ValidationError("Invalid date_to. Expected YYYY-MM-DD.")
        dt_to = datetime.combine(d, time(23, 59, 59, 999999), tzinfo=tz)
    if dt_from and dt_to and dt_from > dt_to:
        raise ValidationError("date_from must not be later than date_to.")
    return dt_from, dt_to


def date_filters(dt_from, dt_to, prefix):
    filters = {}
    if dt_from is not None:
        filters[f"{prefix}gte"] = dt_from
    if dt_to is not None:
        filters[f"{prefix}lte"] = dt_to
    return filters


def to_money(value):
    if value is None:
        value = Decimal("0.00")
    return f"{Decimal(value):.2f}"


def sales_metrics(business, dt_from, dt_to):
    sale_filter = date_filters(dt_from, dt_to, "created_at__")
    base = Sale.objects.filter(business=business, **sale_filter)

    total = base.count()
    draft = base.filter(status=Sale.Status.DRAFT).count()
    completed = base.filter(status=Sale.Status.COMPLETED).count()
    voided = base.filter(status=Sale.Status.VOIDED).count()

    revenue = SaleLine.objects.filter(
        sale__business=business,
        sale__status=Sale.Status.COMPLETED,
        **date_filters(dt_from, dt_to, "sale__created_at__"),
    ).aggregate(total=Sum(F("quantity") * F("unit_price")))["total"]
    revenue = Decimal(revenue) if revenue is not None else Decimal("0.00")

    loyalty = Sale.objects.filter(
        business=business,
        status=Sale.Status.COMPLETED,
        **sale_filter,
    ).aggregate(total=Sum("loyalty_earned"))["total"]
    loyalty = Decimal(loyalty) if loyalty is not None else Decimal("0.00")

    return {
        "total": total,
        "completed": completed,
        "voided": voided,
        "draft": draft,
        "revenue": to_money(revenue),
        "loyalty_earned": to_money(loyalty),
    }


def purchasing_metrics(business, dt_from, dt_to):
    po_filter = date_filters(dt_from, dt_to, "created_at__")
    base = PurchaseOrder.objects.filter(business=business, **po_filter)
    total = base.count()
    draft = base.filter(status=PurchaseOrder.Status.DRAFT).count()
    confirmed = base.filter(status=PurchaseOrder.Status.CONFIRMED).count()
    cancelled = base.filter(status=PurchaseOrder.Status.CANCELLED).count()

    cost = PurchaseOrderLine.objects.filter(
        purchase_order__business=business,
        purchase_order__status=PurchaseOrder.Status.CONFIRMED,
        **date_filters(dt_from, dt_to, "purchase_order__created_at__"),
    ).aggregate(total=Sum(F("quantity") * F("unit_price")))["total"]
    cost = Decimal(cost) if cost is not None else Decimal("0.00")

    return {
        "total": total,
        "confirmed": confirmed,
        "cancelled": cancelled,
        "draft": draft,
        "cost": to_money(cost),
    }


def finance_metrics(business, dt_from, dt_to):
    expense_total = Expense.objects.filter(
        business=business,
        **date_filters(dt_from, dt_to, "created_at__"),
    ).aggregate(total=Sum("amount"))["total"]
    expense_total = Decimal(expense_total) if expense_total is not None else Decimal("0.00")

    journal_counts = (
        Journal.objects.filter(
            business=business,
            **date_filters(dt_from, dt_to, "created_at__"),
        )
        .values("status")
        .annotate(count=Count("id"))
    )
    journal_status = {"DRAFT": 0, "POSTED": 0, "REVERSED": 0}
    for row in journal_counts:
        journal_status[row["status"]] = row["count"]

    entry_filter = {
        "journal__business": business,
        "journal__status": Journal.Status.POSTED,
        **date_filters(dt_from, dt_to, "journal__created_at__"),
    }
    debit = JournalEntry.objects.filter(
        entry_type=JournalEntry.EntryType.DEBIT, **entry_filter
    ).aggregate(total=Sum("amount"))["total"]
    debit = Decimal(debit) if debit is not None else Decimal("0.00")

    credit = JournalEntry.objects.filter(
        entry_type=JournalEntry.EntryType.CREDIT, **entry_filter
    ).aggregate(total=Sum("amount"))["total"]
    credit = Decimal(credit) if credit is not None else Decimal("0.00")

    return {
        "expense_total": to_money(expense_total),
        "journal": journal_status,
        "journal_entry": {
            "DEBIT": to_money(debit),
            "CREDIT": to_money(credit),
        },
    }


def counts_metrics(business):
    customers = Customer.objects.filter(business=business).count()
    products = Product.objects.filter(business=business).count()
    variants = Variant.objects.filter(product__business=business).count()
    employees = Employee.objects.filter(business=business).count()
    employees_active = Employee.objects.filter(business=business, active=True).count()
    return {
        "customers": customers,
        "products": products,
        "variants": variants,
        "employees": employees,
        "employees_active": employees_active,
    }


class OverviewView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.require_business_permission("reports", "view")
        dt_from, dt_to = parse_date_params(request)
        return Response(
            {
                "sales": sales_metrics(business, dt_from, dt_to),
                "purchasing": purchasing_metrics(business, dt_from, dt_to),
                "finance": finance_metrics(business, dt_from, dt_to),
                "counts": counts_metrics(business),
            },
            status=200,
        )


class SalesReportView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.require_business_permission("reports", "view")
        dt_from, dt_to = parse_date_params(request)
        return Response(sales_metrics(business, dt_from, dt_to), status=200)


class PurchasingReportView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.require_business_permission("reports", "view")
        dt_from, dt_to = parse_date_params(request)
        return Response(purchasing_metrics(business, dt_from, dt_to), status=200)


class FinanceReportView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.require_business_permission("reports", "view")
        dt_from, dt_to = parse_date_params(request)
        return Response(finance_metrics(business, dt_from, dt_to), status=200)


def inventory_metrics(business):
    from apps.inventory.models import Stock

    total_products = Product.objects.filter(business=business).count()
    total_variants = Variant.objects.filter(product__business=business).count()

    total_stock_quantity = Stock.objects.filter(location__business=business).aggregate(
        total=Sum("quantity")
    )["total"]
    if total_stock_quantity is None:
        total_stock_quantity = Decimal("0.00")

    variant_ids = Variant.objects.filter(product__business=business).values_list("id", flat=True)
    variant_qtys = (
        Stock.objects.filter(location__business=business)
        .values("variant_id")
        .annotate(total_qty=Sum("quantity"))
    )
    qty_map = {item["variant_id"]: item["total_qty"] or Decimal("0.00") for item in variant_qtys}

    low_stock_count = 0
    for v_id in variant_ids:
        qty = qty_map.get(v_id, Decimal("0.00"))
        if qty <= Decimal("5.00"):
            low_stock_count += 1

    inventory_value = Stock.objects.filter(location__business=business).aggregate(
        value=Sum(F("quantity") * F("variant__product__price"))
    )["value"]
    if inventory_value is None:
        inventory_value = Decimal("0.00")

    return {
        "total_products": total_products,
        "total_variants": total_variants,
        "total_stock_quantity": float(total_stock_quantity),
        "low_stock_count": low_stock_count,
        "inventory_value": f"{Decimal(inventory_value):.2f}",
    }


class InventoryReportView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.require_business_permission("reports", "view")
        return Response(inventory_metrics(business), status=200)
