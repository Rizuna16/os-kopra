# KOPERA OS — KASIR MODULE RED REPORT

## A. Existing Architecture Reused
- **Sales Domain (`apps/sales`):** Reused `Sale`, `SaleLine` models and serializers, along with atomic inventory deduction logic (`_reduce_stock_for_sale`) upon sale completion.
- **Business/Location Boundary (`apps/business`):** Reused `Business`, `Location`, and `BusinessMembership` (`KASIR` role) with `BusinessAccessMixin` for tenant isolation.
- **Customer Domain (`apps/customer`):** Reused `Customer` model for POS customer association.
- **Permissions (`apps/authentication`):** Reused `ROLE_PERMISSIONS` matrix for KASIR role access controls.

## B. Required New Domain Concepts
1. **Cashier Shift (`CashierShift` model):**
   - Tracks cash drawer state: `cashier` (User), `business` (Business), `location` (Location), `modal_awal` (Opening cash), `status` (OPEN/CLOSED), `uang_tunai_aktual` (Actual cash counted at close), `selisih_kas` (Cash variance), opened_at, closed_at.
2. **Payment Method / Type on Sales:**
   - Extending `Sale` or transaction processing to record `payment_method` (CASH, QRIS, TRANSFER).
3. **Held Transactions (`HELD` status):**
   - Extending `Sale.Status` choices to include `HELD` for cart holding and resumption.

## C. Backend RED Tests
- Located at: `apps/sales/tests/test_kasir_pos_red.py`
- Verified test cases:
  - `test_cashier_can_open_shift` (expected FAIL: shifts API not found)
  - `test_one_active_shift_at_a_time_per_cashier_location` (expected FAIL: shifts API not found)
  - `test_cross_tenant_shift_creation_blocked`
  - `test_cashier_can_close_shift_with_reconciliation` (expected FAIL: shifts API not found)
  - `test_pos_transaction_succeeds_with_payment_and_shift` (expected FAIL: missing `payment_method`)
  - `test_cashier_can_hold_and_resume_transaction` (expected FAIL: `HELD` status not allowed)
  - `test_cashier_cannot_access_finance`
  - `test_cashier_cannot_modify_products`
  - `test_cashier_cannot_access_platform_admin`

## D. Frontend RED Tests
- Located at: `frontend/src/test/kasir.test.tsx`
- Verified test cases:
  - Authentication guard redirection.
  - Active shift check & opening shift modal flow.
  - POS transaction cart interaction, product search, payment method selection, hold & resume.
  - Expected FAIL: `Failed to resolve import "../pages/KasirDashboard"`.

## E. Authorization Contract
- **KASIR Role:** Allowed to view dashboard, create/view sales, view customers, view inventory, view promotions, view notifications, view storefront. Denied from product modification, purchasing, supplier, finance, reports, employee management, membership, settings, billing, security, backup, integration, and Super Admin.
- **Super Admin:** Platform-level bypass; does not automatically act as a tenant cashier.

## F. Tenant/Location Isolation Contract
- Shift and sales transactions are strictly bound to `Business` and `Location`.
- Cross-tenant requests return `403` or `404`.
- Cashiers cannot open shifts or create sales for other businesses or unauthorized locations.

## G. Payment Contract
- Supported methods in POS: `CASH`, `QRIS`, `TRANSFER`.
- Integrated with existing sales creation workflow.

## H. Exact Expected Failures
- Backend: HTTP 404 for `/shifts/`, KeyError for `payment_method`, HTTP 400 for invalid status `HELD`.
- Frontend: Vite module resolution error for `KasirDashboard`.

## I. Test Command + Result
- Backend: `pytest apps/sales/tests/test_kasir_pos_red.py` → 5 failed, 4 passed (failures match expected missing capabilities).
- Frontend: `npm test -- src/test/kasir.test.tsx` (in `frontend/`) → 1 failed suite due to missing `KasirDashboard`.

## J. Files Created
- `apps/sales/tests/test_kasir_pos_red.py`
- `frontend/src/test/kasir.test.tsx`
- `KASIR_RED_REPORT.md`

## K. Files Modified
- NONE.

## L. Confirmation No Production Implementation
- No production models, views, serializers, URLs, or frontend components were implemented during this RED phase.

## M. Next GREEN Target
- Implement backend `CashierShift` model, serializer, views, and URL route under `api/v1/businesses/<uuid:business_id>/shifts/`.
- Extend `Sale` / `SaleLine` / serializers to support `payment_method` and `HELD` status.
- Implement frontend `KasirDashboard` page and router registration under `/kasir`.
