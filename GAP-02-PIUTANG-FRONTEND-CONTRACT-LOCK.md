# GAP-02 PIUTANG — FRONTEND CONTRACT LOCK
**Status:** READY FOR HUMAN APPROVAL  
**Phase:** GREEN PHASE 3 (FRONTEND UI) — CONTRACT LOCK  
**Source of Truth:** GAP-02 PIUTANG Contract Lock + Amendment #3 Final, GAP-02 Frontend Discovery Report, KOPERA_OS_MASTER.md, MASTER_STRUKTUR_KOPERA_OS.md

---

## A. Scope

This Contract Lock governs the implementation of the **GAP-02 Piutang Frontend UI** in `frontend/src/`. The backend is complete (64/64 tests passing, security audit PASS, zero regression) and serves as the single authoritative source of truth.

### Required Artifacts to Create (Phase 3 Implementation):
1. `frontend/src/receivable/types.ts` — TypeScript domain types, DTOs, and API interfaces.
2. `frontend/src/receivable/receivableService.ts` — API client service layer wrapping all 8 backend endpoints.
3. `frontend/src/pages/ReceivableList.tsx` — List view, filtering, search, pagination, and KPI header.
4. `frontend/src/pages/CreditSaleCreate.tsx` — Form for creating a new credit sale / receivable.
5. `frontend/src/pages/ReceivableDetail.tsx` — Financial summary, payment history, state/role-gated actions (Pay, Edit, Reverse, Close).
6. `frontend/src/pages/PiutangReports.tsx` — Aging summary breakdown and customer debt aggregation report.
7. Router Registrations in `frontend/src/routes/router.tsx`:
   * `/receivables`
   * `/receivables/new`
   * `/receivables/reports`
   * `/receivables/:receivableId`
8. Sidebar Navigation: Entry for "Piutang" linking to `/receivables`.
9. Frontend Vitest Test Suite in `frontend/src/test/receivable*.test.ts(x)`.

---

## B. API Contract

The frontend MUST consume the 8 existing, locked backend endpoints via `apiClient.ts` without modifying backend API routes or behavior:

| # | HTTP Method | Path | Action | Role Access |
|---|---|---|---|---|
| 1 | `GET` | `/api/v1/businesses/{bid}/receivables/` | List Receivables | OWNER, ADMIN, KASIR (Kasir requires `location`) |
| 2 | `POST` | `/api/v1/businesses/{bid}/receivables/` | Create Credit Sale | OWNER, ADMIN, KASIR |
| 3 | `GET` | `/api/v1/businesses/{bid}/receivables/{id}/` | Get Receivable Detail | OWNER, ADMIN, KASIR (Kasir requires `location`) |
| 4 | `PATCH` | `/api/v1/businesses/{bid}/receivables/{id}/` | Update Due Date / Notes | OWNER, ADMIN (Kasir receives 403) |
| 5 | `POST` | `/api/v1/businesses/{bid}/receivables/{id}/pay/` | Record Payment | OWNER, ADMIN, KASIR |
| 6 | `POST` | `/api/v1/businesses/{bid}/receivables/{id}/payments/{pid}/reverse/` | Reverse Payment Allocation | OWNER ONLY (Admin/Kasir receive 403) |
| 7 | `POST` | `/api/v1/businesses/{bid}/receivables/{id}/close/` | Administrative Close / Write-Off | OWNER ONLY (Admin/Kasir receive 403) |
| 8 | `GET` | `/api/v1/businesses/{bid}/receivables/reports/` | Get Piutang Reports & Aging | OWNER, ADMIN (Kasir receives 403) |

---

## C. Type Contract (`frontend/src/receivable/types.ts`)

```typescript
export type ReceivableStatus = "UNPAID" | "PARTIAL" | "PAID" | "VOIDED" | "CLOSED";
export type PaymentMethodChoice = "CASH" | "QRIS" | "TRANSFER";

export interface PaymentAllocation {
  id: string;
  business: string;
  receivable: string;
  amount: string;
  payment_method: PaymentMethodChoice;
  payment_date: string;
  reference: string;
  notes: string;
  is_reversed: boolean;
  reversed_at: string | null;
  reversed_by: string | null;
  reversal_reason: string;
  created_by: string | null;
  created_at: string;
}

export interface Receivable {
  id: string;
  business: string;
  location: string;
  customer: string;
  sale: string;
  invoice_number: string;
  original_amount: string;
  paid_amount: string;
  outstanding_amount: string;
  status: ReceivableStatus;
  due_date: string | null;
  is_overdue: boolean;
  notes: string;
  allocations: PaymentAllocation[];
  created_at: string;
  updated_at: string;
}

export interface CreditSaleLinePayload {
  variant: string;
  quantity: string;
  unit_price: string;
  applied_promotion?: string | null;
}

export interface CreditSaleCreatePayload {
  location: string;
  customer: string;
  lines: CreditSaleLinePayload[];
  initial_payment?: string;
  payment_method?: PaymentMethodChoice;
  due_date?: string | null;
  notes?: string;
  reference?: string;
  invoice_number?: string;
}

export interface ReceivableUpdatePayload {
  due_date?: string | null;
  notes?: string;
}

export interface PaymentCreatePayload {
  amount: string;
  payment_method: PaymentMethodChoice;
  reference?: string;
  notes?: string;
}

export interface PaymentReversePayload {
  reversal_reason: string;
}

export interface ReceivableClosePayload {
  notes?: string;
}

export interface PiutangAgingSummary {
  not_due: string;
  days_1_15: string;
  days_16_30: string;
  days_31_60: string;
  over_60_days: string;
}

export interface CustomerDebtSummary {
  customer_id: string;
  customer_name: string;
  outstanding: string;
  open_receivables_count: number;
}

export interface PiutangReportResponse {
  total_outstanding: string;
  total_overdue: string;
  count_customers_with_debt: number;
  aging_summary: PiutangAgingSummary;
  receivables_by_customer: CustomerDebtSummary[];
}
```

---

## D. Route Contract

New routes registered inside `<BusinessProvider>` in `frontend/src/routes/router.tsx`:

* `/receivables` → `<ReceivableList />` wrapped in `<ProtectedRoute>`, `<BusinessRoute>`, `<AppLayout>`
* `/receivables/new` → `<CreditSaleCreate />` wrapped in `<ProtectedRoute>`, `<BusinessRoute>`, `<AppLayout>`
* `/receivables/reports` → `<PiutangReports />` wrapped in `<ProtectedRoute>`, `<BusinessRoute>`, `<AppLayout>`
* `/receivables/:receivableId` → `<ReceivableDetail />` wrapped in `<ProtectedRoute>`, `<BusinessRoute>`, `<AppLayout>`

---

## E. Navigation Contract

* **Sidebar Label:** "Piutang"
* **Route Target:** `/receivables`
* **Visibility:** Rendered for OWNER, ADMIN, KASIR.
* **Active State:** Highlighted when current pathname starts with `/receivables`.

---

## F. User Journey

1. **Credit Sale Creation (`/receivables/new`):**
   * Select Location & Customer.
   * Add lines (Variant, Quantity, Unit Price).
   * Optional initial DP payment & payment method.
   * Optional due date & notes.
   * Submit → Creates COMPLETED sale + UNPAID/PARTIAL receivable → Redirects to `/receivables/:id`.
2. **Receivable List & Monitoring (`/receivables`):**
   * Top KPI Cards: Total Outstanding, Total Overdue, Customers with Debt.
   * Filter controls: Status, Customer, Overdue flag, Date range.
   * Table display with status badges, overdue indicators, and row actions.
3. **Receivable Detail (`/receivables/:id`):**
   * Financial Overview: Original Amount, Paid Amount, Outstanding Amount, Due Date.
   * Actions Bar (Role + State gated): "Record Payment", "Edit Due Date", "Close Receivable".
   * Payment Allocations Table: Payment date, Amount, Method, Reference, Actor, Reversal badge, and "Reverse" button (Owner only).
4. **Payment Modal:**
   * Clearly displays current `outstanding_amount`.
   * Input `amount` (validated `> 0` and `<= outstanding_amount`), `payment_method`, `reference`, `notes`.
   * Confirmation step.
   * Friendly error presentation on 400 (e.g. overpayment or race condition).
5. **Reversal Modal (Owner Only):**
   * Requires non-empty `reversal_reason`.
   * Displays financial impact warning.
   * Updates balance and status dynamically on success.
6. **Close / Write-Off Modal (Owner Only):**
   * Displays outstanding amount being written off.
   * Clear explanation that `CLOSED != PAID` (administrative closure).
   * Updates status to `CLOSED` and `outstanding_amount` to `0.00`.

---

## G. State Machine

| Receivable Status | Record Payment | Edit Due Date / Notes | Reverse Payment | Close Receivable |
|---|---|---|---|---|
| **UNPAID** | Available | Available (Owner/Admin) | N/A (no payments) | Available (Owner) |
| **PARTIAL** | Available | Available (Owner/Admin) | Available (Owner) | Available (Owner) |
| **PAID** | Disabled / Hidden | Available (Owner/Admin) | Available (Owner) | Disabled / Hidden |
| **CLOSED** | Disabled / Hidden | Disabled / Hidden | Disabled / Hidden | Disabled / Hidden |
| **VOIDED** | Disabled / Hidden | Disabled / Hidden | Disabled / Hidden | Disabled / Hidden |

### Derived Overdue Rule:
* `is_overdue = true` IF AND ONLY IF `due_date < today` AND `outstanding_amount > 0` AND `status IN ['UNPAID', 'PARTIAL']`.
* `PAID`, `CLOSED`, `VOIDED` receivables are **NEVER** overdue.
* `due_date = today` is **NOT** overdue.

---

## H. Role Matrix

| Action | OWNER | ADMIN | KASIR |
|---|---|---|---|
| View Receivables List | All Locations | All Locations | Active Location Only |
| View Receivable Detail | All Locations | All Locations | Active Location Only |
| Create Credit Sale | Permitted | Permitted | Permitted |
| Record Payment | Permitted | Permitted | Permitted |
| Edit Due Date / Notes | Permitted | Permitted | Hidden / Denied |
| Reverse Payment Allocation | Permitted | Hidden / Denied | Hidden / Denied |
| Close Receivable | Permitted | Hidden / Denied | Hidden / Denied |
| View Piutang Reports | Permitted | Permitted | Hidden / Denied |

*Note: Role visibility in UI is presentation-only. Backend authorization remains authoritative.*

---

## I. Location Scope

* **Kasir Role:** Frontend automatically injects `currentLocationId` from `BusinessContext` into API requests (`?location={currentLocationId}`).
* **Owner / Admin Roles:** Multi-location access permitted; location filter dropdown allows selecting specific location or "All Locations".

---

## J. List UX (`frontend/src/pages/ReceivableList.tsx`)

* **Page Header:** "Piutang / Receivables" + "Create Credit Sale" CTA button (`/receivables/new`).
* **KPI Header Cards:**
  * Total Outstanding (`data-testid="kpi-total-outstanding"`)
  * Total Overdue (`data-testid="kpi-total-overdue"`)
  * Customers with Debt (`data-testid="kpi-customers-with-debt"`)
* **Filter Bar:** Status selector, Customer selector, Location selector (Owner/Admin), Overdue checkbox, Date From/To picker.
* **Table Columns:** Invoice #, Customer, Location, Original, Paid, Outstanding, Due Date, Status Badge, Overdue Indicator, Actions ("View", "Pay").
* **States:** Loading skeleton (`data-testid="receivable-list-loading"`), Error alert (`data-testid="receivable-list-error"`), Empty state (`data-testid="receivable-list-empty"`).

---

## K. Detail UX (`frontend/src/pages/ReceivableDetail.tsx`)

* **Header:** Invoice number, Customer name, Status badge, Overdue pill badge.
* **Summary Cards:** Original Amount, Paid Amount, Outstanding Amount, Due Date.
* **Action Bar:** "Record Payment", "Edit Due Date", "Close Receivable" (visibility governed by State Machine & Role Matrix).
* **Payment Allocations Table:** Date, Amount, Payment Method, Reference, Created By, Status (Valid / Reversed), Reversal Reason (if reversed), Actions ("Reverse" button for valid allocations, Owner only).

---

## L. Payment UX

* **Dialog Title:** "Record Payment for Invoice {invoice_number}"
* **Prominent Balance:** Shows current `outstanding_amount`.
* **Inputs:**
  * Amount (`<input type="number">`, validated `> 0` and `<= outstanding_amount`).
  * Payment Method (`CASH`, `QRIS`, `TRANSFER`).
  * Reference (`<input type="text">`, optional).
  * Notes (`<textarea>`, optional).
* **Validation Errors:** Clear inline message if amount exceeds outstanding or is invalid.
* **Concurrency Handling:** If API returns `400 Bad Request` due to balance change, display clear error message: *"Payment failed: Outstanding balance has changed. Please refresh and try again."*

---

## M. Reversal UX

* **Owner-Only Action:** "Reverse Payment" button on allocation row.
* **Modal Inputs:** Reversal Reason (`<textarea>`, required, non-empty).
* **Warning Message:** *"Reversing this payment will restore the outstanding balance by {amount}. This action cannot be undone."*
* **Post-Reversal State:** Allocation is marked with a "Reversed" badge; reversal date and reason displayed.

---

## N. Close UX

* **Owner-Only Action:** "Close Receivable (Write-Off)" button on detail page.
* **Modal Explanation:** *"Closing a receivable marks it as uncollectible write-off. Outstanding balance will be set to 0.00. CLOSED is not the same as PAID."*
* **Inputs:** Notes (`<textarea>`, optional).
* **Confirmation Button:** "Confirm Close".

---

## O. Credit Sale UX (`frontend/src/pages/CreditSaleCreate.tsx`)

* **Form Fields:**
  * Location selector (defaults to `currentLocationId`).
  * Customer selector.
  * Line items builder (Variant picker, Quantity, Unit Price).
  * Optional initial DP payment & Payment Method.
  * Optional Due Date & Notes.
  * Optional Reference & Invoice Number.
* **Calculated Totals:** Live total calculation from line items. DP validated `<= total_amount`.
* **Submit Action:** Calls `createCreditSale()`. On success, redirects to created receivable detail view.

---

## P. Reports UX (`frontend/src/pages/PiutangReports.tsx`)

* **Role Gate:** Owner & Admin only. Kasir redirected or denied.
* **Aging Summary Cards:**
  * Not Due
  * 1–15 Days Overdue
  * 16–30 Days Overdue
  * 31–60 Days Overdue
  * > 60 Days Overdue
* **Customer Debt Breakdown Table:** Customer Name, Outstanding Balance, Open Receivables Count.

---

## Q. Aging Contract

* **Buckets:** `Not Due`, `1–15 Days`, `16–30 Days`, `31–60 Days`, `Over 60 Days`.
* **Exclusions:** `PAID`, `CLOSED`, and `VOIDED` receivables are strictly excluded from aging totals.
* **Database Status Invariant:** `OVERDUE` is strictly a derived presentation state, NEVER a database status.

---

## R. Visual Design System

* Follows established KOPERA OS Tailwind CSS design language.
* Status Badge Color Mapping:
  * `UNPAID` → Red (`bg-red-50 text-red-700 border-red-200`)
  * `PARTIAL` → Amber (`bg-amber-50 text-amber-700 border-amber-200`)
  * `PAID` → Emerald (`bg-emerald-50 text-emerald-700 border-emerald-200`)
  * `CLOSED` → Gray (`bg-gray-100 text-gray-700 border-gray-200`)
  * `VOIDED` → Slate (`bg-slate-100 text-slate-500 border-slate-200`)
  * `OVERDUE` → Red pill (`bg-red-600 text-white text-xs px-2 py-0.5 rounded-full`)

---

## S. Accessibility

* All form fields accompanied by visual `<label>` elements.
* Dialog modals handle keyboard `Esc` dismissal and focus management.
* Status indicators include plain-text status names alongside color coding.

---

## T. Test Contract

Vitest test files to create during Phase 3:
1. `frontend/src/test/receivableService.test.ts`: Unit tests for all 8 service wrapper functions.
2. `frontend/src/test/receivableList.test.tsx`: List rendering, KPI header, filters, loading/empty/error states.
3. `frontend/src/test/creditSaleCreate.test.tsx`: Credit sale creation form, lines calculation, DP validation.
4. `frontend/src/test/receivableDetail.test.tsx`: Detail summary, allocation table, payment modal, reversal modal, close modal.
5. `frontend/src/test/receivableReports.test.tsx`: Aging breakdown cards and customer debt table.
6. `frontend/src/test/receivableRolePermission.test.tsx`: Verifies Owner/Admin/Kasir UI action visibility and role gating.

---

## U. Explicitly Locked Out (DO NOT IMPLEMENT)

* Customer Detail receivable tab.
* Sale Detail receivable linkage badge.
* Export CSV / XLSX buttons on Piutang report page.
* Modifications to locked `OwnerDashboard.tsx` or `OwnerDashboard.test.tsx`.
* Automatic payment gateway integration.
* Automated reminder / notification emails.
* Penalty / interest calculation engines.
* Any backend code, schema, or API endpoint modifications.

---

## V. Out of Scope

* Third-party accounting platform sync.
* Refund / credit note generation.
* Customer credit limit enforcement.

---

## W. Locked Modules (Zero Modification Allowed)

* `apps/sales/`
* `apps/inventory/`
* `apps/customer/`
* `apps/business/`
* `apps/finance/`
* `apps/authentication/`
* `frontend/src/pages/OwnerDashboard.tsx`
* `frontend/src/test/OwnerDashboard.test.tsx`

---

## X. Implementation Sequence

1. **RED PHASE:** Create frontend test files first (`frontend/src/test/receivable*.test.tsx`). Execute `npm test` / `vitest` to verify tests fail due to missing implementation.
2. **GREEN PHASE:** Create TypeScript types, service layer, pages, router registrations, and sidebar entries until all tests pass.
3. **RECONCILIATION & AUDIT:** Run full frontend test suite + full backend test suite (`pytest`) to ensure zero regression.

---

GREEN PHASE 3 — PIUTANG FRONTEND CONTRACT LOCK  
STATUS: READY FOR HUMAN APPROVAL
