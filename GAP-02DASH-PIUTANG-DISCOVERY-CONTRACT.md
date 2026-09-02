# GAP-02DASH-PIUTANG — DISCOVERY & CONTRACT LOCK

Status: 🔴 DEFERRED — CONTRACT REQUIRED
Scope: OWNER DASHBOARD → OVERVIEW → Piutang / KEUANGAN → Piutang
Date: 2026-09-01

---

## A. REPOSITORY BASELINE

- **Branch**: `main`
- **HEAD**: `a918a8c00729d29ac39845bd1815bb3e6bc2a2eb`
- **origin/main**: `a918a8c00729d29ac39845bd1815bb3e6bc2a2eb`
- **Working Tree**: Clean

---

## B. SOURCE OF TRUTH

- `STRUKTUR_OWNER.md`: Domain 1 (OVERVIEW) → Submenu 1.7 `Piutang`; Domain 5 (KEUANGAN) → Submenu 5.3 `Piutang`.
- `MASTER_STRUKTUR_KOPERA_OS.md`: Section 4 (Modul Inti) → 11. Customer, 12. Finance.
- `KOPERA_OS_MASTER.md`: Section 5.1 (Core Business Architecture), Section 18.5 (Customer V1), Section 12 (SALES).

---

## C. EXISTING AR FOUNDATION — AUDIT EVIDENCE

### 1. Sale Status
- **File**: `apps/sales/models.py:62-66`
- **Status choices**: `DRAFT`, `COMPLETED`, `VOIDED`
- **Finding**: No `UNPAID`, `PARTIALLY_PAID`, `PAID` status exists. `COMPLETED` means the sale transaction is finalized (stock reduced), NOT that payment has been received.

### 2. Payment Method
- **File**: `apps/sales/models.py:74-78, 105-110`
- **PaymentMethod choices**: `CASH`, `QRIS`, `TRANSFER`
- **Finding**: `payment_method` indicates the payment CHANNEL, not payment STATE. A `COMPLETED` sale with `payment_method=CASH` implies immediate cash payment, but there is no field to record whether a credit/transfer sale has actually been paid.

### 3. Payment State
- **Finding**: NO `payment_status` field exists on `Sale`. No field tracks whether a sale is `PAID`, `UNPAID`, or `PARTIALLY_PAID`.

### 4. Customer Relation
- **File**: `apps/sales/models.py:90-96`
- **Finding**: `Sale.customer` is nullable FK to `Customer`. Optional. Used for loyalty tracking, not payment tracking.

### 5. Customer Balance / Outstanding
- **File**: `apps/customer/models.py:8-31`
- **Finding**: `Customer` has `name`, `phone`, `email`, `address`. NO `balance`, `outstanding`, `credit_limit`, or `receivable_balance` field exists.

### 6. Partial Payment Capability
- **Finding**: NONE. No partial payment model, no payment allocation logic, no installment tracking.

### 7. Unpaid / Credit Sale Capability
- **Finding**: NONE. Current architecture assumes every COMPLETED sale is immediately paid. No concept of "sell now, pay later" exists.

### 8. Payment Transaction Records
- **Finding**: `apps/billing/models.py:34-81` defines `Payment` model, but it is EXCLUSIVELY for Midtrans subscription payments (`subscription` FK → `business.Subscription`). NOT related to sale payments. No sale payment transaction records exist.

### 9. Journal / Accounting Entries
- **File**: `apps/finance/models.py:33-137`
- **Finding**: `Journal`, `JournalEntry`, `Ledger` models exist for general double-entry accounting. However, NO automatic journal entries are created when a sale is COMPLETED. Manual journal entry creation is the only path. No receivable/contra-revenue automatic entries.

### 10. Business Scoping
- **Finding**: ALL sale, customer, finance, and reports data is business-scoped via `BusinessAccessMixin`. Tenant isolation is well-established.

### 11. Existing API
- **Finding**: No AR-related endpoints exist. Reports API computes `revenue` (total COMPLETED sales) but not "collected" vs "uncollected" revenue.

### 12. AR Ledger
- **Finding**: Does NOT exist.

### 13. Historical Receivable Calculation
- **Finding**: CANNOT be calculated. No data exists to determine which completed sales were paid vs unpaid.

### 14. Data Ambiguity
- **Critical**: `COMPLETED` sale with `payment_method=CASH` → semantically "paid in cash" but not explicitly recorded. `COMPLETED` sale with `payment_method=TRANSFER` → could be paid or could be pending transfer confirmation. `COMPLETED` sale with `payment_method=null` → ambiguous payment state. Without explicit payment tracking, historical receivable cannot be reconstructed.

---

## D. MISSING ARCHITECTURE

| Component | Status | Required |
|---|---|---|
| Receivable/AR model | 🔴 Missing | YES |
| Payment allocation model | 🔴 Missing | YES |
| Customer balance tracking | 🔴 Missing | YES |
| Sale payment_status field | 🔴 Missing | YES |
| Due date on receivable | 🔴 Missing | YES |
| AR report aggregation | 🔴 Missing | YES |
| Owner AR dashboard widget | 🔴 Missing | YES |
| Partial payment logic | 🔴 Missing | YES |
| Credit sale workflow | 🔴 Missing | YES |

---

## E. DATA SEMANTICS

### What Piutang (Accounts Receivable) Means in KOPERA

A **Piutang** (Receivable) is created when:
1. A sale is finalized (`COMPLETED`).
2. The sale is NOT fully paid at time of creation (credit sale / "jual kredit").
3. A customer owes the business money.

A **Piutang** is reduced when:
1. A payment is received against the receivable.
2. Partial payments reduce the outstanding amount.
3. Full payment closes the receivable.

### Ambiguity Resolution

**Current `Sale.payment_method` CANNOT serve as payment status.** The contract must explicitly decouple:
- `Sale.payment_method` → payment channel (CASH/QRIS/TRANSFER) — UNCHANGED
- `Receivable.status` → payment state (UNPAID/PARTIAL/PAID/OVERDUE/CLOSED) — NEW

---

## F. SECURITY / TENANT BOUNDARY

- All receivable data MUST be business-scoped via `business` FK.
- `BusinessAccessMixin` + `require_business_permission()` enforced on all AR endpoints.
- Cross-business AR access returns 404.
- Customer data isolation preserved.
- No exposure of AR data to unauthenticated users.

---

## G. HISTORICAL DATA POLICY

- **Pre-AR sales**: Cannot be retroactively classified as paid/unpaid.
- **Policy**: Pre-AR completed sales are treated as "settled at creation" with `receivable_amount=0`. No historical piutang is fabricated.
- **Migration**: Existing `Sale` records are NOT modified. New `Receivable` model is created independently.

---

## H. PROPOSED ARCHITECTURE

### New Models

#### 1. `Receivable` (Piutang)
```
Receivable
├── id (UUID, PK)
├── business (FK → Business)
├── customer (FK → Customer)
├── sale (FK → Sale, one-to-one)
├── invoice_number (CharField, auto-generated)
├── original_amount (Decimal) — total receivable at creation
├── paid_amount (Decimal, default=0) — cumulative payments received
├── outstanding_amount (Decimal, computed) — original_amount - paid_amount
├── status (CharField: UNPAID/PARTIAL/PAID/OVERDUE/CLOSED)
├── due_date (DateField, nullable) — optional credit term
├── notes (TextField, blank)
├── created_at (DateTimeField)
├── updated_at (DateTimeField)
```

#### 2. `PaymentAllocation` (Pembayaran Piutang)
```
PaymentAllocation
├── id (UUID, PK)
├── business (FK → Business)
├── receivable (FK → Receivable)
├── amount (Decimal) — payment amount applied
├── payment_date (DateField)
├── payment_method (CharField: CASH/QRIS/TRANSFER/BANK_TRANSFER)
├── reference (CharField, blank) — payment reference number
├── notes (TextField, blank)
├── created_at (DateTimeField)
```

### Lifecycle
```
Sale COMPLETED → Receivable created (if credit sale)
  → UNPAID
  → PaymentAllocation created → PAID amount updated → PARTIAL
  → Full payment → PAID
  → Due date passed without full payment → OVERDUE
  → Owner marks closed → CLOSED
```

---

## I. API BOUNDARY

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/v1/businesses/<id>/receivables/` | GET | List receivables with filters |
| `POST /api/v1/businesses/<id>/receivables/` | POST | Create receivable (from COMPLETED sale) |
| `GET /api/v1/businesses/<id>/receivables/<uuid>/` | GET | Receivable detail |
| `PATCH /api/v1/businesses/<id>/receivables/<uuid>/` | PATCH | Update due_date / notes / status |
| `POST /api/v1/businesses/<id>/receivables/<uuid>/pay/` | POST | Record payment allocation |
| `GET /api/v1/businesses/<id>/reports/piutang/` | GET | Piutang report aggregation |

### Query Parameters (List)
- `?status=UNPAID` — filter by status
- `?customer=<uuid>` — filter by customer
- `?overdue=true` — filter overdue receivables
- `?date_from=` / `?date_to=` — filter by creation date

### Report Response Shape
```json
{
  "total_receivable": "5000000.00",
  "total_paid": "3000000.00",
  "total_outstanding": "2000000.00",
  "count_unpaid": 3,
  "count_partial": 2,
  "count_paid": 10,
  "count_overdue": 1,
  "receivables_by_customer": [
    {"customer_id": "...", "customer_name": "...", "outstanding": "1500000.00"}
  ]
}
```

---

## J. MODEL / MIGRATION BOUNDARY

- **New Django app**: `apps/receivable/` (or extend `apps/finance/` — decision pending)
- **New models**: `Receivable`, `PaymentAllocation`
- **New migrations**: 1 initial migration for new models
- **Modified models**: NONE (existing Sale, Customer, Finance untouched)
- **New serializers**: `ReceivableSerializer`, `ReceivableCreateSerializer`, `PaymentAllocationSerializer`
- **New views**: `ReceivableListView`, `ReceivableDetailView`, `ReceivablePayView`, `PiutangReportView`
- **New URLs**: Added to `config/urls.py`

---

## K. OUT-OF-SCOPE

- Accounts Payable (Hutang) — separate GAP (GAP-03DASH-HUTANG)
- Auto-posting of journal entries for receivable creation/payment
- Credit limit management
- Interest/penalty on overdue receivables
- Multi-currency receivables
- Customer portal for payment status
- Receipt generation
- Tax invoice integration

---

## L. RISKS / AMBIGUITIES

1. **Sale ↔ Receivable relationship**: One-to-one (one sale = one receivable) or one-to-many (one sale can have multiple payment allocations)? **Decision**: One-to-one (Sale → Receivable), with multiple PaymentAllocations per Receivable.
2. **When is Receivable created?** Only when explicitly marked as "credit sale" or when payment is not immediate? **Decision**: Explicit creation only (owner/admin initiates credit sale).
3. **Can a COMPLETED sale be retroactively turned into a credit sale?** **Decision**: Yes, within the same business day or before next reporting period. Not after receivable report has been finalized.
4. **Voided sale with existing receivable**: **Decision**: Voiding a sale with open receivables is blocked. Receivable must be settled first.

---

## M. CONTRACT LOCK PROPOSAL

### Part 27 — RECEIVABLE (PIUTANG) CONTRACT V1

**Status**: LOCKED upon approval.

**Scope**: Accounts Receivable (Piutang) for Owner Dashboard

**Models**:
- `Receivable` — business-scoped, customer-scoped, sale-linked
- `PaymentAllocation` — receivable-scoped payment records

**Semantics**:
- Receivable created explicitly (credit sale / "jual kredit")
- PaymentAllocation reduces outstanding_amount
- Status transitions: UNPAID → PARTIAL → PAID; UNPAID → OVERDUE; PAID → CLOSED
- Due date optional
- Voided sale with open receivable → blocked

**API**: 6 endpoints (CRUD + pay + report)

**Migration**: 1 initial migration for new models

**Authorization**: `BusinessAccessMixin` + `require_business_permission("receivables", "view"/"create"/"update")`

**Owner visibility**: Piutang report in Owner Dashboard Executive KPI and Keuangan section

---

## N. FINAL GATE DECISION

```text
🔴 DEFERRED — CONTRACT REQUIRED
```

Piutang (Accounts Receivable) requires entirely new architecture: new models, new API endpoints, new report aggregation, and new business logic. No existing repository foundation can satisfy this requirement without significant backend work. The contract above provides the architectural blueprint for future implementation.
