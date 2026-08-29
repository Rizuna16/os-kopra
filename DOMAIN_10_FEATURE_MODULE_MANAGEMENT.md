# KOPERA OS — DOMAIN 10 FEATURE & MODULE MANAGEMENT ARCHITECTURE

## 1. Overview
Domain 10 provides platform-level governance for modules and features across the KOPERA OS platform. It operates strictly within the Super Admin boundary and is completely orthogonal to tenant role-based permissions (`ROLE_PERMISSIONS`, `BusinessAccessMixin`).

## 2. Structural Boundary
```
PLATFORM KOPERA
└── SUPER ADMIN
    ├── Governance (Part 25, Part 28 P0)
    ├── Commercial Foundation (06 Subscription & Plan, 07 Payment & Billing)
    └── 10. Feature & Module Management
```
Super Admin is not a tenant role. Tenant users (Owner, Admin, Kasir) have zero access to platform feature/module administration.

## 3. Data Models
- **`Module`**: Represents platform modules (`code`, `name`, `description`, `is_active`, timestamps).
- **`Feature`**: Represents granular capabilities under a module (`module` FK, `code`, `name`, `description`, `is_active`, `is_beta`, timestamps).
- **`PlanFeature`**: Bridges `Plan` (`apps.billing.models.Plan`) and `Feature` (`is_enabled`, `UNIQUE(plan, feature)`).
- **`BusinessFeatureOverride`**: Bridges `Business` and `Feature` (`state`: `INHERIT`, `ENABLED`, `DISABLED`, `UNIQUE(business, feature)`). Managed exclusively by Super Admin.

## 4. Effective Entitlement Resolver
Centralized resolver function `is_feature_enabled(business, feature_code)` with strict precedence:
1. Module inactive → `False`
2. Feature inactive → `False`
3. Business Feature Override (`ENABLED` → `True`, `DISABLED` → `False`, `INHERIT` → continue)
4. Effective active Plan (`active Subscription` → `latest PAID Payment` → `Payment.plan` → `PlanFeature.is_enabled`)
5. Feature default fallback

## 5. Platform Admin APIs (`/api/v1/admin/`)
- `/api/v1/admin/modules/` (CRUD, enable, disable)
- `/api/v1/admin/features/` (CRUD, enable, disable)
- `/api/v1/admin/plans/{plan_id}/features/` (list, assign, remove)
- `/api/v1/admin/businesses/{business_id}/features/` (list overrides, patch override state)

## 6. Security, Audit & Sanitization
- **Authorization**: Requires `IsSuperAdmin` (`request.user.is_superuser == True`). Anonymous → 401, Tenant/Staff → 403.
- **Audit**: Server-generated `AuditLog` entries for all views and mutations.
- **Sanitization**: Explicit serializers prevent exposure of tokens, passwords, secrets, or gateway credentials.

## 7. Frontend
- Located under `/platform-admin/modules` and `/platform-admin/features`, rendered inside `PlatformLayout`. Does not depend on `BusinessContext` or tenant membership.

## 8. Checkpoint Reconciliation
- PART 25 persistence test assertions were reconciled to accommodate additive Domain 10 models, migrations, and services while preserving the protective intent of PART 25.
