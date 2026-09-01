# GAP-01DASH-LABA — CONTRACT GATE REVIEW

Status: 🟡 CONTRACT NEEDS REVISION
Scope: OWNER DASHBOARD → OVERVIEW → Estimasi Laba
Review Date: 2026-09-01

---

## A. REPOSITORY BASELINE

- **Branch**: `main`
- **HEAD**: `d5ec18285695207bfd9d7646bf2faf5aa7964d63`
- **Working Tree**: Clean (only `GAP-01DASH-LABA-DISCOVERY-CONTRACT.md` is untracked)

---

## B. CONTRACT CLAIMS VERIFICATION

### 1. `Variant.cost_price`
- **Status**: ❌ **UNVERIFIED** (Proposed in contract, does not exist)
- **Actual Repository State**: `apps/product/models.py` defines `Variant` with only `id`, `product`, `name`, `created_at`, `updated_at`. There is NO `cost_price` field.

### 2. `SaleLine.applied_cost_price`
- **Status**: ❌ **UNVERIFIED** (Proposed in contract, does not exist)
- **Actual Repository State**: `apps/sales/models.py` defines `SaleLine` with `id`, `sale`, `variant`, `quantity`, `unit_price`, `applied_promotion`, `applied_discount_type`, `applied_discount_value`. There is NO `applied_cost_price` field.

### 3. COGS Calculation
- **Status**: ❌ **UNVERIFIED** (Does not exist)
- **Actual Repository State**: `apps/reports/views.py:70-100` computes `revenue` (Sales COMPLETED) and `cost` (Purchasing CONFIRMED), but neither is labeled as COGS. There is no HPP calculation engine in the backend.

### 4. Gross Profit
- **Status**: ❌ **UNVERIFIED** (Does not exist)

### 5. Net Profit
- **Status**: ❌ **UNVERIFIED** (Does not exist)

### 6. Revenue Source
- **Status**: ✅ **VERIFIED**
- **Evidence**: `apps/reports/views.py:79-84`: `Sum(F("quantity") * F("unit_price"))` for `Sale.status == COMPLETED`.

### 7. Expense Source
- **Status**: ✅ **VERIFIED**
- **Evidence**: `apps/reports/views.py:128-132`: `Sum("amount")` for `Expense`.

### 8. Completed / VOIDED / DRAFT Semantics
- **Status**: ✅ **VERIFIED**
- **Evidence**: `apps/reports/views.py:70-84`: `revenue` is calculated ONLY on `Sale.status == COMPLETED`. `draft` and `voided` sales are excluded from revenue.

### 9. Refund/Cancel Semantics
- **Status**: ✅ **VERIFIED**
- **Evidence**: `apps/sales/serializers.py:447-456`: "Voiding a completed sale requires stock reversal which is not defined in the contract." Voided sales do not generate revenue.

### 10. Historical Cost Preservation
- **Status**: ❌ **UNVERIFIED** (Proposed in contract, does not exist)
- **Note**: Contract proposes snapshotting `applied_cost_price` on `SaleLine` at COMPLETED time. This does not exist.

### 11. Date-Range Semantics
- **Status**: ✅ **VERIFIED**
- **Evidence**: `apps/reports/views.py:70-84`: `date_from` and `date_to` parsed via `parse_date_params()` and applied as `created_at__gte` / `created_at__lte`.

### 12. Decimal/Rounding Behavior
- **Status**: ✅ **VERIFIED**
- **Evidence**: `apps/reports/views.py:84`: `revenue = Decimal(revenue) if revenue is not None else Decimal("0.00")`. All monetary values use 2-decimal strings via `to_money()`.

### 13. Business/Tenant Isolation
- **Status**: ✅ **VERIFIED**
- **Evidence**: All reports querysets filter by `business=business` via `BusinessAccessMixin`.

### 14. Existing Sales Compatibility
- **Status**: ✅ **VERIFIED SAFE** (Additive field proposal with `default=0.00` is safe for locked Sales contracts)

---

## C. EXISTING ARCHITECTURE VERIFICATION

### A. Source of Truth
- `Product.price`: SELLING PRICE ONLY (Retail price to customer).
- `PurchaseOrderLine.unit_price`: HISTORICAL PURCHASE PRICE (Cash/payable outflow to supplier for acquiring inventory).
- There is **NO** `Variant.cost_price` field anywhere.
- `SaleLine` has no cost snapshot.

### B. Profit Calculation Gap
| Component | Source | Status |
|---|---|---|
| Revenue (Penjualan) | `SaleLine` where COMPLETED | ✅ Available |
| Expense (Pengeluaran) | `Expense.amount` | ✅ Available |
| Purchasing Acquisition Cost | `PurchaseOrderLine` where CONFIRMED | ✅ Available |
| HPP / COGS (Cost of Goods Sold) | `Variant.cost_price` | 🔴 Missing |
| Gross Profit (Laba Kotor) | `Revenue - COGS` | 🔴 Missing |
| Net Profit (Laba Bersih) | `Gross Profit - Expenses` | 🔴 Missing |

---

## D. DATA MODEL IMPACT

### Proposed Model Changes:
1. `apps/product/models.py` → `Variant`: Add `cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)`.
2. `apps/sales/models.py` → `SaleLine`: Add `applied_cost_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)`.

### Risk Assessment:
- Adding `cost_price` to `Variant` with `default=0.00` is SAFE and migration-compatible.
- Adding `applied_cost_price` to `SaleLine` with `null=True` is SAFE and backward-compatible with historical sales.
- **Conclusion**: No breaking schema changes proposed.

---

## E. CALCULATION SEMANTICS

### COGS Calculation:
`COGS = Sum(SaleLine.quantity * SaleLine.applied_cost_price)` where `Sale.status == COMPLETED`.

### Gross Profit:
`Gross Profit = Revenue - COGS`.

### Net Profit:
`Net Profit = Gross Profit - Expense Total`.

### Date-Range Semantics:
Scoped to `date_from` and `date_to` on `Sale.created_at` (for Revenue & COGS) and `Expense.created_at` (for Expenses).

---

## F. HISTORICAL DATA SEMANTICS

- Historical sales without `applied_cost_price` will return `NULL` or `0.00`.
- Historical profit calculation will be inaccurate for those records.
- No data backfill proposed (acceptable for V1 rollout).

---

## G. API IMPACT

- `apps/reports/views.py`: `OverviewView.get()` will need to add `gross_profit` and `net_profit` to the response payload.
- No new endpoints proposed.
- Existing endpoints remain backward-compatible (additive fields only).

---

## H. FRONTEND IMPACT

- `frontend/src/reports/types.ts`: Add `gross_profit` and `net_profit` to `OverviewReport`.
- `frontend/src/dashboard/dashboardService.ts`: Map `overview.gross_profit` to `DashboardData.executive.totalLabaKotor`.
- `frontend/src/pages/OwnerDashboard.tsx`: Add Estimasi Laba KPI cards.

---

## I. SECURITY & TENANT ISOLATION

- All profit calculations remain behind `BusinessAccessMixin` and `require_business_permission("reports", "view")`.
- No public exposure of cost data.
- No RBAC changes proposed.

---

## J. REGRESSION RISK

- **LOW**: Additive model fields with safe defaults.
- **MEDIUM**: New calculation engine requires robust unit tests to avoid incorrect profit values.

---

## K. REQUIRED TESTS

- Unit tests for COGS aggregation logic.
- Unit tests for Gross Profit formula.
- Unit tests for Net Profit formula.
- Tests for historical sales with `applied_cost_price = NULL`.
- Tests for date-range profit calculations.
- Security/tenant isolation tests for profit endpoints.

---

## L. OUT-OF-SCOPE

- FIFO/LIFO/Average cost valuation across stock movements (deferred to future Inventory V2).
- Refund/Credit Note handling (deferred to Finance V2).
- Profit center per Location (deferred to Analytics V2).

---

## M. FINAL GATE DECISION

### 🟡 CONTRACT NEEDS REVISION

The conceptual formulas and data sources are accurate and valid. However, the proposed `Cost Price / HPP Source of Truth` section in `GAP-01DASH-LABA-DISCOVERY-CONTRACT.md` proposes specific schema extensions (`Variant.cost_price` and `SaleLine.applied_cost_price`) that do not yet exist. Before implementation can begin, this contract must be explicitly approved by the architectural gatekeeper and formally locked as an amendment to the locked Part 8 (Product) and Part 12 (Sales) contracts.

### REQUIRED REVISION STEPS:
1. Formalize `Variant.cost_price` as an official **Part 8 Amendment**.
2. Formalize `SaleLine.applied_cost_price` as an official **Part 12 Amendment**.
3. Confirm default value behavior (`0.00` for `Variant.cost_price`, `NULL` for `SaleLine.applied_cost_price`).
4. Document historical data backfill policy (or explicit acceptance of `NULL`/`0.00` for pre-amendment records).
5. Explicitly state that `Variant.cost_price` is a single flat cost price (not FIFO/LIFO/Average) to lock down architectural scope.
