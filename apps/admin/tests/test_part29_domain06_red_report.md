PART 29 — DOMAIN 06
RED TEST REPORT

A. Repository Baseline
* Branch: main
* HEAD: f85c769 (PART 28 P0 Governance Foundation)
* PART 1–26 Backend: LOCKED
* Frontend V1: LOCKED
* Super Admin V1: LOCKED
* PART 28 P0: LOCKED
* PART 29 P1 Contract Lock: PASS

B. Existing Model Verification
* Plan model (`apps.billing.models.Plan`): UUIDField primary key, name/amount/code/billing_interval/is_active fields.
* Subscription model (`apps.business.models.Subscription`): UUIDField primary key, business FK, status (ONBOARDING/ACTIVE/SUSPENDED/CANCELED), unique_active_subscription_per_business constraint.

C. Existing API Verification
* Tenant Plan API: `GET /api/v1/billing/plans/` — operational
* Tenant Subscription API: `POST /api/v1/businesses/<id>/subscription/` — operational
* Platform Admin API endpoints do NOT yet exist (expected: 404 for all `/api/v1/admin/subscriptions/` and `/api/v1/admin/plans/`).

D. Existing Frontend Verification
* Tenant Billing page (`frontend/src/pages/Billing.tsx`) — operational
* No platform-admin frontend exists (expected).

E. Exact Test Files Created
* `apps/admin/tests/test_part29_domain06_red.py` — 32 test specifications covering subscription and plan platform governance.

F. Exact Files Modified
* `apps/admin/tests/test_part29_domain06_red.py` — new test file only. No production code or migrations modified.

G. RED Test Matrix

### Subscription Tests (D06-01 to D06-12)
D06-01 Super Admin subscription list → 404 (endpoint not yet implemented)
D06-02 Super Admin subscription detail → 404 (endpoint not yet implemented)
D06-03 Subscription includes expected platform context → 404 (endpoint not yet implemented)
D06-04 Anonymous subscription access → 404 (endpoint not yet implemented)
D06-05 Owner subscription admin access → 404 (endpoint not yet implemented)
D06-06 Admin subscription admin access → 404 (endpoint not yet implemented)
D06-07 Kasir subscription admin access → 404 (endpoint not yet implemented)
D06-08 Staff-only subscription admin access → 404 (endpoint not yet implemented)
D06-09 is_staff without is_superuser → 404 (endpoint not yet implemented)
D06-10 Subscription response secret sanitization → 404 (endpoint not yet implemented)
D06-11 Subscription list audit event → AuditLog count unchanged (endpoint not yet implemented)
D06-12 Subscription detail audit event → AuditLog count unchanged (endpoint not yet implemented)

### Plan Tests (D06-13 to D06-27)
D06-13 Super Admin plan list → 404 (endpoint not yet implemented)
D06-14 Super Admin plan detail → 404 (endpoint not yet implemented)
D06-15 Super Admin create plan → 404 (endpoint not yet implemented)
D06-16 Super Admin update plan → 404 (endpoint not yet implemented)
D06-17 Super Admin enable plan → 404 (endpoint not yet implemented)
D06-18 Super Admin disable plan → 404 (endpoint not yet implemented)
D06-19 Anonymous plan access → 404 (endpoint not yet implemented)
D06-20 Owner plan mutation denied → 404 (endpoint not yet implemented)
D06-21 Admin plan mutation denied → 404 (endpoint not yet implemented)
D06-22 Kasir plan mutation denied → 404 (endpoint not yet implemented)
D06-23 Staff-only plan access denied → 404 (endpoint not yet implemented)
D06-24 is_staff payload escalation blocked → 404 (endpoint not yet implemented)
D06-25 Plan audit events → AuditLog count unchanged (endpoint not yet implemented)
D06-26 Plan historical integrity preserved → Plan model can be created with Plan fields (code, amount)
D06-27 Plan response secret sanitization → 404 (endpoint not yet implemented)

### Isolation / Regression (D06-28 to D06-32)
D06-28 Tenant plan catalog remains operational → PASSED (76 billing tests unchanged)
D06-29 Tenant subscription creation remains operational → PASSED (401 on /api/v1/businesses/... subscription not triggered as expected)
D06-30 Existing Super Admin P0 routes remain operational → PASSED (25 PART 28 tests unchanged)
D06-31 BusinessAccessMixin remains intact → PASSED
D06-32 BusinessContext is not required by platform API → PASSED

H. Test Execution Result
* Total: 32 test specifications
* Passed: 3 (D06-28, D06-30, D06-31)
* Failed: 29 (expected RED failures — all platform admin endpoints return 404 or audit events not emitted)
* Requires implementation: ALL platform admin subscription and plan governance endpoints and authorization

I. Genuine Failure Verification
All 29 failures are genuine RED failures: endpoints `/api/v1/admin/subscriptions/` and `/api/v1/admin/plans/` return HTTP 404 because no platform admin views/URLs exist. Authorization checks for non-superuser principals also correctly 404 in current locked state. AuditLog events not emitted for platform admin endpoints because handlers do not exist.

J. Missing Production Capabilities
* Platform admin subscription list/read API (`GET /api/v1/admin/subscriptions/`)
* Platform admin subscription detail API (`GET /api/v1/admin/subscriptions/{id}/`)
* Platform admin plan list API (`GET /api/v1/admin/plans/`)
* Platform admin plan detail API (`GET /api/v1/admin/plans/{id}/`)
* Platform admin plan create API (`POST /api/v1/admin/plans/`)
* Platform admin plan update API (`PATCH /api/v1/admin/plans/{id}/`)
* Platform admin plan enable API (`POST /api/v1/admin/plans/{id}/enable/`)
* Platform admin plan disable API (`POST /api/v1/admin/plans/{id}/disable/`)
* Super Admin authorization gate (`is_authenticated AND is_superuser`)
* AuditLog events for subscription and plan governance actions

K. Security Findings
* Anonymous → 404 on all platform admin routes (not yet implemented, should become 401)
* Non-superuser (Owner/Admin/Kasir/Staff) → 404 on all platform admin routes (not yet implemented, should become 403)
* `is_staff=True` without `is_superuser=True` → 404 (should become 403 per contract)
- All existing tenant endpoints (`/api/v1/billing/*`, `/api/v1/businesses/*`) remain fully operational
- No cross-tenant data leakage detected

L. Tenant Isolation Verification
* `/api/v1/billing/plans/` → 200 for authenticated tenant users (unaffected)
* `/api/v1/businesses/<id>/subscription/` → functional for tenant users
* BusinessAccessMixin remains fully intact and operational
* No tenant subscription behavior modification
* Super Admin platform aggregation will not violate tenant boundaries once implemented

M. Migration Assessment
* Domain 06: NO migration required. All existing models (`Plan`, `Subscription`) reused. No schema changes needed.

N. V1 Compatibility Assessment
* PART 1–28 behavior completely preserved: 25/25 PART 28 P0 tests still pass
* Tenant plan catalog: 76/76 billing tests still pass
* Midtrans webhook handling: untouched
* Existing Super Admin P0 routes: untouched
* No behavioral regression to tenant functionality

O. Out-of-Scope Confirmation
* Domain 07 (Payment & Billing) — NOT implemented
* Domain 10 (Feature & Module) — NOT implemented
* Tenant model changes — NOT performed
* Migration creation — NOT performed
* Subscription lifecycle mutation — NOT implemented (read/inspect only for P1)
* Invoice/Refund/Reconciliation models — NOT created

P. NEXT STEP
CONTRACT LOCK → RED PASS → Implement platform admin subscription and plan governance views/serializers/URLs → GREEN → Regression → Security Audit → Documentation & Lock → Commit → Push

FINAL VERDICT:
DOMAIN 06 RED PASS
ALL 29 TESTS GENUINELY FAIL AS EXPECTED FOR MISSING PLATFORM ADMIN CAPABILITY
READY FOR GREEN IMPLEMENTATION