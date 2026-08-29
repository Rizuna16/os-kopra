# PART 28 — SUPER ADMIN PLATFORM V2

# P0 GOVERNANCE FOUNDATION

# STATUS: LOCKED

## Implemented Domains

| Domain | Endpoint | Frontend Route |
|--------|----------|---------------|
| 02 Account Management | `GET /api/v1/admin/accounts/`, `/{owner_user_id}/` | `/platform-admin/accounts`, `/:ownerUserId` |
| 03 Owner Management | `GET /api/v1/admin/owners/`, `/{owner_id}/` | `/platform-admin/owners`, `/:ownerId` |
| 04 Business / Usaha Management | `GET /api/v1/admin/businesses/`, `/{business_id}/` (V1) | `/platform-admin/businesses`, `/:businessId` (V1) |
| 05 User / Employee Management | `GET /api/v1/admin/users/`, `/{user_id}/` | `/platform-admin/users`, `/:userId` |
| 18 KOPERA Admin Management | `GET /api/v1/admin/admins/`, `/{admin_id}/` | `/platform-admin/admins`, `/:adminId` |

## Authorization

- `IsSuperAdmin` (`is_authenticated AND is_superuser=True`).
- Anonymous → 401; Owner/Admin/Kasir/Staff → 403.
- `is_staff=True` does NOT grant platform access.
- No privilege escalation via request body.

## Audit Events

ACCOUNT_LIST_VIEWED, ACCOUNT_DETAIL_VIEWED, OWNER_LIST_VIEWED, OWNER_DETAIL_VIEWED,
BUSINESS_LIST_VIEWED, BUSINESS_DETAIL_VIEWED, USER_LIST_VIEWED, USER_DETAIL_VIEWED,
ADMIN_LIST_VIEWED, ADMIN_DETAIL_VIEWED (via existing `AuditLog`).

## Data Sanitization

User serializer excludes password, password hashes, tokens, sessions, secret keys.

## Constraints Preserved

- No physical Account model.
- No migrations in `apps/admin`.
- `Business` tenant boundary unchanged.
- `BusinessAccessMixin` / tenant routes untouched.
- Read-only P0 (no mutations).

## Test Counts

- Backend P0: 25 tests (`apps/admin/tests/test_part28_p0_red.py`) — PASS.
- Backend full regression: 1225 passed.
- Frontend P0: 6 tests (`superAdminP0.test.tsx`) — PASS (17 incl. V1 super admin).
- TypeScript `tsc --noEmit`: PASS.
- Production build: PASS.

## Security Audit

All 15 security checks verified. No tenant data leakage, no privilege escalation,
no secret exposure, no BusinessContext dependency, no Account table, tenant boundary intact.

## Commit

See git log for `feat(admin): implement super admin platform v2 p0 governance foundation`.
