# GAP-01DASH-LABA — DISCOVERY & CONTRACT LOCK REPORT

Status: 🟡 DEFERRED — CONTRACT REQUIRED
Scope: OWNER DASHBOARD → OVERVIEW → Estimasi Laba
Authority: Architectural & Metric Contract Lock Baseline
Date: 2026-09-01

---

## 1. REPOSITORY BASELINE

- **Branch**: `main`
- **HEAD**: `d5ec18285695207bfd9d7646bf2faf5aa7964d63`
- **origin/main**: `d5ec18285695207bfd9d7646bf2faf5aa7964d63`
- **Working Tree**: Clean

---

## 2. SOURCE OF TRUTH VERIFICATION

The audit reconciled the target GAP across canonical sources:
1. `STRUKTUR_OWNER.md`: Domain 1 (OVERVIEW) → Submenu 1.5 `Estimasi Laba`.
2. `MASTER_STRUKTUR_KOPERA_OS.md`: Section 2 (DASHBOARD UTAMA OWNER) → `Total keuntungan` / `Total laba`.
3. `KOPERA_OS_MASTER.md`: Section 5.1 (OWNER DASHBOARD) → `Total Laba`, `Laba Kotor`, `Laba Bersih` metric contract warnings (§5.1.C).

---

## 3. EXISTING ARCHITECTURE & COST/HPP EVIDENCE

A comprehensive codebase audit was performed across models, serializers, views, and reports:

### A. Selling Price & Revenue Foundation (🟢 AVAILABLE)
- **Model**: `apps/product/models.py:16` (`Product.price = models.DecimalField(max_digits=12, decimal_places=2)`)
- **Sale Line**: `apps/sales/models.py:148` (`SaleLine.unit_price = models.DecimalField(max_digits=12, decimal_places=2)`)
- **Revenue Calculation**: `apps/reports/views.py:83`
  - Formula: `Sum(quantity * unit_price)` for `Sale.status == Sale.Status.COMPLETED`.
  - Endpoint: `GET /api/v1/businesses/<uuid:business_id>/reports/sales/`

### B. Expense Foundation (🟢 AVAILABLE)
- **Model**: `apps/finance/models.py` (`Expense.amount = models.DecimalField(...)`)
- **Expense Aggregation**: `apps/reports/views.py:128`
  - Formula: `Sum(amount)` for `Expense` filtered by `business`.
  - Endpoint: `GET /api/v1/businesses/<uuid:business_id>/reports/finance/`

### C. Purchasing Cost Foundation (🟡 PARTIAL / NOT COGS)
- **Model**: `apps/purchasing/models.py:68` (`PurchaseOrderLine.unit_price = models.DecimalField(...)`)
- **Purchasing Cost Aggregation**: `apps/reports/views.py:111`
  - Formula: `Sum(quantity * unit_price)` for `PurchaseOrder.status == PurchaseOrder.Status.CONFIRMED`.
  - Endpoint: `GET /api/v1/businesses/<uuid:business_id>/reports/purchasing/`
  - **Limitation**: This represents inventory acquisition cost (cash/payable outflow for supplier purchases), **NOT** Cost of Goods Sold (COGS/HPP) for items actually sold to customers.

### D. Cost Price / HPP on Product or Variant (🔴 MISSING)
- `Product` has ONLY `price` (selling price).
- `Variant` has NO `price` and NO `cost_price`.
- `SaleLine` has NO `cost_price` snapshot.
- `Stock` / `Batch` has NO unit cost valuation field.

---

## 4. PROFIT FEASIBILITY & GAP ANALYSIS

| Component | Status | Source |
|---|---|---|
| Revenue (Penjualan) | 🟢 AVAILABLE | `SaleLine` where status == COMPLETED |
| Expenses (Pengeluaran Operasional) | 🟢 AVAILABLE | `Expense` model aggregated by business |
| Purchasing Acquisition Cost | 🟢 AVAILABLE | `PurchaseOrderLine` where status == CONFIRMED |
| HPP / Cost of Goods Sold (COGS) | 🔴 MISSING | No `cost_price` field on Product, Variant, or SaleLine |
| Gross Profit (Laba Kotor) | 🔴 UNCOMPUTABLE | Requires COGS (`Revenue - COGS`) |
| Net Profit (Laba Bersih) | 🔴 UNCOMPUTABLE | Requires Gross Profit (`Gross Profit - Expenses`) |

---

## 5. PROPOSED CONTRACT LOCK (GAP-01DASH-LABA)

When future architectural work is authorized, the implementation must adhere to this Contract Lock:

### A. Cost Price / HPP Source of Truth
1. Add `cost_price` (DecimalField, max_digits=12, decimal_places=2, default=0.00) to `Variant` (or `Product`).
2. When creating a `SaleLine` upon transition to `COMPLETED`, snapshot `cost_price` onto `SaleLine` (`applied_cost_price`) to ensure historical profit immutability even if variant base cost changes later.

### B. Profit Formulas
1. **COGS (HPP)** = `Sum(SaleLine.quantity * SaleLine.applied_cost_price)` for `Sale.status == COMPLETED`.
2. **Gross Profit (Laba Kotor)** = `Revenue - COGS`.
3. **Net Profit (Laba Bersih)** = `Gross Profit - Expense Total`.

### C. Date-Range & Status Semantics
- Date filters: `date_from` and `date_to` match `Sale.created_at` (Revenue & COGS) and `Expense.created_at` (Expenses).
- Sale status: **COMPLETED ONLY**. `DRAFT` and `VOIDED` sales are strictly excluded.
- Reversal/Refund: Voided sales do not generate revenue or COGS.

### D. Multi-Tenant & RBAC Isolation
- All querysets gated by `BusinessAccessMixin` + `require_business_permission("reports", "view")`.
- Owner-only access for KOPERA AI facts integration.

---

## 6. ARCHITECTURAL SAFETY AUDIT

- **Authentication / Authorization**: Unchanged.
- **Tenant Isolation**: Preserved via `business` scoping.
- **Locked Modules (Nodes 15–19)**: Untouched.
- **Database Schema**: No migrations or schema alterations created during this audit.

---

## 7. FINAL DECISION

```text
🟡 DEFERRED — CONTRACT REQUIRED
```

Calculating **Estimasi Laba** (Gross & Net Profit) requires adding a `cost_price` schema field to `Product`/`Variant` and `SaleLine`, along with a dedicated migration and calculation engine. Per execution rules, work stops at this formal Contract Lock. No code, model, migration, or API changes were performed.
