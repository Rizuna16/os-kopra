# GAP-01DASH-LABA — CONTRACT AMENDMENT

Status: 🟢 CONTRACT AMENDMENT READY FOR APPROVAL
Scope: OWNER DASHBOARD → OVERVIEW → Estimasi Laba (GAP-01)
Authority: Formal Additive Contract Amendment to PART 8 (Product) & PART 12 (Sales)
Date: 2026-09-01

---

## 1. REPOSITORY BASELINE

- **Branch**: `main`
- **HEAD**: `d5ec18285695207bfd9d7646bf2faf5aa7964d63`
- **origin/main**: `d5ec18285695207bfd9d7646bf2faf5aa7964d63`
- **Working Tree**: Clean (except untracked discovery and gate reports)

---

## 2. SOURCE OF TRUTH & DISCOVERY RECONCILIATION

- `STRUKTUR_OWNER.md`: Domain 1 (OVERVIEW) → Submenu 1.5 `Estimasi Laba`.
- `MASTER_STRUKTUR_KOPERA_OS.md`: Section 2 & Section 8 (PART 18 Reports & Analytics, PART 16 Finance).
- `KOPERA_OS_MASTER.md`: Section 5.1 (Core Business Architecture) & Section 18.7 (PART 18 Reports & Analytics V1).
- **Discovery Findings**:
  - `Product` has `price` (selling price). `Variant` has no price or cost fields.
  - `SaleLine` has `unit_price` (selling price) but no historical cost snapshot.
  - `Expense` model aggregates operational expenses.
  - Purchasing acquisition cost (`PurchaseOrderLine.unit_price`) exists but is distinct from COGS (Cost of Goods Sold).
  - True profit calculation requires formal additive amendments to Part 8 (Product) and Part 12 (Sales).

---

## 3. PART 8 — PRODUCT CONTRACT AMENDMENT (ADDITIVE)

### Scope & Definition: `Variant.cost_price`
1. **Field Location**: Added to the `Variant` model (`apps.product.models.Variant`).
2. **Semantics**: Represents the default unit cost price (HPP dasar) of a product variant.
3. **Source of Truth**: Serves as the base cost price reference when a new sale line is created or finalized.
4. **Data Type & Precision**: `models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))`, strictly conforming to repository monetary precision conventions (`max_digits=12, decimal_places=2`).
5. **Backward Compatibility**: Existing variants default to `Decimal("0.00")`.
6. **Invariants Preserved**:
   - Does NOT change selling price (`Product.price`).
   - Does NOT change stock quantity or inventory valuation engine.
   - Does NOT introduce FIFO, LIFO, Weighted Average, or accounting inventory valuation models.
   - Does NOT modify existing Purchasing or Product CRUD contracts beyond the additive `cost_price` field.

---

## 4. PART 12 — SALES CONTRACT AMENDMENT (ADDITIVE)

### Scope & Definition: `SaleLine.applied_cost_price`
1. **Field Location**: Added to the `SaleLine` model (`apps.sales.models.SaleLine`).
2. **Semantics**: Represents the historical unit cost snapshot of a variant at the exact moment a sale transitions to `COMPLETED`.
3. **Immutability**: Once a sale is completed, `applied_cost_price` is immutable, ensuring historical profit stability even if `Variant.cost_price` is updated later.
4. **Data Type & Precision**: `models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)`, conforming to repository monetary precision conventions.
5. **Snapshot Timing**: Populated at the `COMPLETED` state transition (reusing the exact pattern of `_snapshot_promotions_for_sale` in `apps/sales/serializers.py`).
6. **Invariants Preserved**:
   - Does NOT change revenue calculation.
   - Does NOT change payment processing, inventory deduction (`_reduce_stock_for_sale`), or cashier shift behavior.
   - Does NOT alter DRAFT or VOIDED sales behavior.
   - Does NOT change tenant isolation or authorization rules.

---

## 5. PROFIT CALCULATION CONTRACT

### A. Revenue
- Basis: Eligible completed sales (`Sale.Status.COMPLETED`).
- Formula: Unchanged from PART 18 Reports contract (`Sum(quantity * unit_price)`).

### B. COGS (HPP)
- Formula:
  $$\text{COGS} = \sum (\text{SaleLine.quantity} \times \text{SaleLine.applied\_cost\_price})$$
  for all `SaleLine` where `Sale.status == COMPLETED`.

### C. Gross Profit (Laba Kotor)
- Formula:
  $$\text{Gross Profit} = \text{Revenue} - \text{COGS}$$

### D. Net Profit (Laba Bersih)
- Formula:
  $$\text{Net Profit} = \text{Gross Profit} - \text{Expense Total}$$
  where `Expense Total` is aggregated from `Expense.amount` within the same business and date range.

---

## 6. HISTORICAL DATA POLICY

- **Legacy SaleLine Behavior**: For sales completed before this amendment (where `applied_cost_price` is `NULL`), the calculation defaults historical unit cost to `Decimal("0.00")` (or evaluates as `0.00`).
- **No Estimation**: No algorithmic guessing or fallback to supplier PO prices is performed for legacy lines, ensuring deterministic and reproducible reporting.
- **Explicit Disclosure**: Historical profit reports containing legacy null cost lines carry an implicit assumption that historical cost for those specific items was zero.

---

## 7. DATE RANGE CONTRACT

- Follows the existing Reports API convention (`parse_date_params(request)`):
  - `date_from` (inclusive start, `>= 00:00:00`)
  - `date_to` (inclusive end, `<= 23:59:59.999999`)
- Applied against `Sale.created_at` (for Sales, COGS, Revenue) and `Expense.created_at` (for Expenses).

---

## 8. DECIMAL / ROUNDING CONTRACT

- All monetary outputs are formatted to 2 decimal places using the existing repository utility `to_money()`.
- Decimal arithmetic (`Decimal`) is used for all intermediate calculations to prevent floating-point rounding errors.

---

## 9. SECURITY & TENANT CONTRACT

- All profit and COGS aggregations remain strictly bound by:
  - `IsAuthenticated`
  - `BusinessAccessMixin`
  - `require_business_permission("reports", "view")`
- Cross-business access attempts return HTTP 404.
- Tenant isolation and IDOR protections are preserved.

---

## 10. API BOUNDARY (REPORT EXTENSION)

- **Endpoint**: `GET /api/v1/businesses/<uuid:business_id>/reports/overview/` (and sales/finance report views).
- **Response Extension (Additive)**:
  - `sales` object adds: `cogs`, `gross_profit`.
  - `finance` object adds: `net_profit`.
- **Backward Compatibility**: Existing clients receiving overview reports receive the new profit metrics alongside existing revenue, expense, and count metrics without disruption.

---

## 11. FRONTEND BOUNDARY (OWNER DASHBOARD)

- **Owner Dashboard (`OwnerDashboard.tsx`)**:
  - Reuses existing `OverviewReport` type (`apps/reports/types.ts`).
  - Displays Gross Profit and Net Profit in the Executive KPI and Operational Pulse sections.
- **No New Routes**: Reuses `/app/dashboard`.

---

## 12. TEST CONTRACT (MINIMUM REQUIREMENTS)

1. `TestVariantCostPrice`: Verify `Variant` cost price creation, default (`0.00`), and validation.
2. `TestSaleLineCostSnapshot`: Verify `SaleLine.applied_cost_price` is correctly snapshot upon transition to `COMPLETED`.
3. `TestCOGSReports`: Verify COGS aggregation excludes DRAFT and VOIDED sales.
4. `TestGrossAndNetProfit`: Verify Gross Profit (`Revenue - COGS`) and Net Profit (`Gross Profit - Expenses`) calculations.
5. `TestReportsTenantIsolation`: Verify cross-business profit access returns 404.
6. `TestLegacySalesHandling`: Verify legacy sale lines with `NULL` cost price resolve safely to `0.00`.

---

## 13. BACKWARD COMPATIBILITY

- Additive model fields (`Variant.cost_price` with default, `SaleLine.applied_cost_price` nullable).
- Additive API response fields (`cogs`, `gross_profit`, `net_profit`).
- Zero breaking changes to existing Part 1–26 contracts.

---

## 14. EXPLICIT OUT-OF-SCOPE

- FIFO / LIFO / Weighted Average inventory valuation.
- Batch-level or Serial-level unit costing.
- Automated backfill of historical sale line costs.
- Profit center breakdown by Location.

---

## 15. IMPLEMENTATION BOUNDARY

- **Migrations**: 1 additive migration (`apps/product` or `apps/sales`).
- **Models**: `Variant`, `SaleLine`.
- **Serializers**: `SaleCreateSerializer`, `SaleUpdateSerializer` (snapshot logic).
- **Views**: `apps/reports/views.py` (COGS, Gross Profit, Net Profit calculations).
- **Tests**: `apps/reports/tests/`, `apps/sales/tests/`.

---

## 16. FINAL APPROVAL RECOMMENDATION

```text
🟢 CONTRACT AMENDMENT READY FOR APPROVAL
```

The formal additive contracts for Part 8 (`Variant.cost_price`) and Part 12 (`SaleLine.applied_cost_price`) are complete, non-breaking, tenant-isolated, and fully aligned with KOPERA OS architecture.
