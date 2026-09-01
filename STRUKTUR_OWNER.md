# KOPERA OS — STRUKTUR OWNER

Status: STRUCTURAL BASELINE
Scope: OWNER DASHBOARD
Version: V1 Structural Baseline
Authority: Owner Dashboard Structural Checklist

## DOCUMENT PURPOSE

* this document defines the OWNER DASHBOARD structural hierarchy;
* it contains 13 primary Owner domains;
* it is used as a checklist for structural reconciliation;
* it must not be confused with KOPERA Super Admin;
* it must not be confused with PART 1–26 technical roadmap;
* it does not itself authorize implementation;
* implementation still requires Discovery → Contract Lock → RED → GREEN → Regression → Security Audit → Documentation → Commit → Push.

## STATUS LEGEND

🟢 **SUDAH**
Implemented and verified.

🟡 **SEBAGIAN**
Some foundation exists, but the complete Owner structural requirement is not yet fulfilled.

🔴 **BELUM**
Present in Owner structure but not yet implemented.

⚪ **BUKAN OWNER**
Not part of OWNER DASHBOARD.

*(Note: At creation time, individual items are marked with status `[UNVERIFIED]` to preserve structural baseline integrity.)*

## OWNER BOUNDARY

OWNER DASHBOARD is separate from:

- KOPERA SUPER ADMIN / PLATFORM ADMIN
- backend PART numbering
- technical Contract Locks
- POST-V1 implementation assumptions

The Owner structure describes the Owner-facing product hierarchy.

Technical implementation must be reconciled against this structure separately.

## STRUCTURAL RULES

1. This hierarchy is the Owner structural baseline.
2. Do not add domains without an explicit structural decision.
3. Do not remove domains without an explicit structural decision.
4. Do not silently rename domains or submenu items.
5. Do not treat technical implementation as proof of structural completion.
6. Every implementation must be reconciled against this hierarchy.
7. Any new GAP must first be mapped to this structure.
8. No implementation may jump outside the authorized structural scope.
9. Super Admin must remain structurally separate from Owner.
10. Locked modules must not be modified merely to satisfy Owner presentation requirements.

---

## OWNER DASHBOARD HIERARCHY

KOPERA
└── OWNER DASHBOARD
    │
    ├── 1. OVERVIEW
    │   ├── Ringkasan Bisnis
    │   ├── Pendapatan Hari Ini
    │   ├── Pendapatan Bulan Ini
    │   ├── Pengeluaran
    │   ├── Estimasi Laba
    │   ├── Jumlah Transaksi
    │   ├── Piutang
    │   ├── Hutang
    │   └── Saldo / Cash Flow
    │
    ├── 2. BUSINESS SWITCHER
    │   ├── Usaha Aktif
    │   ├── Daftar Usaha
    │   ├── Tambah Usaha
    │   └── Pengaturan Usaha
    │
    ├── 3. ANALYTICS
    │   ├── Grafik Pendapatan
    │   ├── Grafik Pengeluaran
    │   ├── Grafik Laba
    │   ├── Perbandingan Periode
    │   ├── Produk/Layanan Terlaris
    │   └── Performa Usaha
    │
    ├── 4. OPERASIONAL
    │   ├── Penjualan
    │   ├── Pembelian
    │   ├── Produk / Layanan
    │   ├── Inventory
    │   ├── Customer
    │   └── Supplier
    │
    ├── 5. KEUANGAN
    │   ├── Pendapatan
    │   ├── Pengeluaran
    │   ├── Piutang
    │   ├── Hutang
    │   ├── Cash Flow
    │   └── Laporan Keuangan
    │
    ├── 6. PEGAWAI
    │   ├── Daftar Pegawai
    │   ├── Tambah Pegawai
    │   ├── Role
    │   ├── Permission
    │   ├── Shift
    │   └── Aktivitas Pegawai
    │
    ├── 7. ONLINE STORE
    │   ├── Store
    │   ├── Produk
    │   ├── Pesanan
    │   ├── Customer
    │   ├── Pembayaran
    │   ├── Promo
    │   └── Pengaturan Store
    │
    ├── 8. LAPORAN
    │   ├── Laporan Penjualan
    │   ├── Laporan Pembelian
    │   ├── Laporan Inventory
    │   ├── Laporan Keuangan
    │   ├── Laporan Pegawai
    │   └── Laporan Bisnis
    │
    ├── 9. NOTIFIKASI
    │   ├── Stok Menipis
    │   ├── Transaksi
    │   ├── Pembayaran
    │   ├── Pesanan
    │   ├── Aktivitas Pegawai
    │   └── System Notification
    │
    ├── 10. AUDIT & AKTIVITAS
    │   ├── Aktivitas Owner
    │   ├── Aktivitas Admin
    │   ├── Aktivitas Kasir
    │   ├── Perubahan Data
    │   └── Riwayat Sistem
    │
    ├── 11. SUBSCRIPTION
    │   ├── Paket Saat Ini
    │   ├── Status
    │   ├── Tanggal Berakhir
    │   ├── Upgrade
    │   ├── Downgrade
    │   ├── Perpanjang
    │   └── Riwayat Pembayaran
    │
    ├── 12. PENGATURAN
    │   ├── Profil Owner
    │   ├── Profil Usaha
    │   ├── Branding
    │   ├── Jam Operasional
    │   ├── Pajak
    │   ├── Pembayaran
    │   ├── Notifikasi
    │   ├── Keamanan
    │   └── Integrasi
    │
    └── 13. SUPPORT
        ├── Bantuan
        ├── Tutorial
        ├── FAQ
        ├── Tiket Support
        └── Hubungi KOPERA

---

## CHECKLIST TABLE

| No | Owner Domain | Status |
|---:|---|---|
| 1 | OVERVIEW | [UNVERIFIED] |
| 2 | BUSINESS SWITCHER | [UNVERIFIED] |
| 3 | ANALYTICS | [UNVERIFIED] |
| 4 | OPERASIONAL | [UNVERIFIED] |
| 5 | KEUANGAN | [UNVERIFIED] |
| 6 | PEGAWAI | [UNVERIFIED] |
| 7 | ONLINE STORE | [UNVERIFIED] |
| 8 | LAPORAN | [UNVERIFIED] |
| 9 | NOTIFIKASI | [UNVERIFIED] |
| 10 | AUDIT & AKTIVITAS | [UNVERIFIED] |
| 11 | SUBSCRIPTION | [UNVERIFIED] |
| 12 | PENGATURAN | [UNVERIFIED] |
| 13 | SUPPORT | [UNVERIFIED] |

---

## GAP DECISION MATRIX

| GAP ID | Domain | Submenu | Status | Evidence | Notes |
|---|---|---|---|---|---|
| GAP-01DASH-LABA | OVERVIEW | Estimasi Laba | 🟡 DEFERRED — CONTRACT REQUIRED | No laba/HPP architecture | Requires accounting cost price (HPP) & profit formula |
| GAP-02DASH-PIUTANG | OVERVIEW/KEUANGAN | Piutang | 🟡 DEFERRED — CONTRACT REQUIRED | No receivables model | Requires AR ledger & model |
| GAP-03DASH-HUTANG | OVERVIEW/KEUANGAN | Hutang | 🟡 DEFERRED — CONTRACT REQUIRED | No payables model | Requires AP ledger & model |
| GAP-04DASH-CASHFLOW | KEUANGAN | Cash Flow | 🟡 DEFERRED — CONTRACT REQUIRED | No cash flow aggregation | Requires cash flow statement engine |
| GAP-05ANALYTICS-CHARTS | ANALYTICS | Grafik Pendapatan / Pengeluaran / Laba | 🟡 DEFERRED — CONTRACT REQUIRED | No charting library | Requires chart lib & period API |
| GAP-06ANALYTICS-COMPARE | ANALYTICS | Perbandingan Periode | 🟡 DEFERRED — CONTRACT REQUIRED | No period comparison | Requires multi-period API |
| GAP-07NOTIF-PRODUCERS | NOTIFIKASI | Stok/Transaksi/Pembayaran/Pesanan/Aktivitas | 🟡 DEFERRED — CONTRACT REQUIRED | No notification producers wired | Requires event bus & cross-module triggers |
| GAP-08SUBSC-LIFECYCLE | SUBSCRIPTION | Upgrade / Downgrade / Perpanjang | 🟡 DEFERRED — CONTRACT REQUIRED | No upgrade/downgrade/renewal endpoint | Requires subscription state machine extension |
| GAP-09SUPPORT-OWNER | SUPPORT | Tiket Support | 🟡 DEFERRED — CONTRACT REQUIRED | Owner-facing support ticket UI missing | Backend SupportTicket model owned by Super Admin boundary |
| GAP-10SETTINGS-SECURITY | PENGATURAN | Keamanan | 🟢 IMPLEMENTED & LOCKED | Backend API `/api/v1/auth/password/change/` + frontend `changePassword` exist | Presentation-only; new Settings "Keamanan" tab surfacing existing API |
| GAP-11OVERRIDE-HOURS | PENGATURAN | Jam Operasional | 🟡 DEFERRED — CONTRACT REQUIRED | No operating hours data model | Requires operating hours schema & validation |
| GAP-12DASHBOARD-EXPIRY | SUBSCRIPTION | Tanggal Berakhir | 🔴 BELUM | No subscription expiry date calculation | Requires expiry date field & logic |
| GAP-13ONLINESTORE-PROMO | ONLINE STORE | Promo | 🟡 DEFERRED — CONTRACT REQUIRED | No online store promotion channel | Requires promotion channel targeting model & validation |
| GAP-14REPORT-HISTORY | SUBSCRIPTION | Riwayat Pembayaran | 🔴 BELUM | Owner-level payment history UI missing | Payment list endpoint is platform-admin scoped |
| GAP-15AUDIT-OWNER | AUDIT & AKTIVITAS | Riwayat Sistem | 🔴 BELUM | Owner-level audit log view missing | PART 26 AuditLog restricted to Super Admin |

---

## IMPLEMENTATION SUMMARY — GAP-10 (PRESENTATION ONLY)

### Contract Lock

- Scope: Presentation-only surfacing of an EXISTING backend API.
- Backend API: `POST /api/v1/auth/password/change/` (PART 1 Authentication — already LOCKED & implemented).
- Frontend service: `changePassword()` in `auth/authService.ts` (already exists).
- No new backend endpoints, models, migrations, routing, RBAC changes, or tenant isolation impact.
- Authorized files:
  - `frontend/src/pages/SettingsSecurity.tsx` (NEW)
  - `frontend/src/pages/Settings.tsx` (MODIFIED: add "security" tab)
  - `frontend/src/test/settingsSecurity.test.tsx` (NEW)
- Forbidden: no backend modifications, no new npm dependencies, no data-testid conflicts.

### RED Evidence

Command: `npm test src/test/settingsSecurity.test.tsx`

Failure: `Failed to resolve import "../pages/SettingsSecurity". Does the file exist?`

Genuine RED confirmed (component did not exist before implementation).

### GREEN Evidence

Command: `npm test src/test/settingsSecurity.test.tsx`

Result: 2/2 PASS (password change success + mismatch validation).

### Regression Evidence

- Frontend typecheck: ✅ PASS (`tsc --noEmit`)
- Frontend build: ✅ PASS (`vite build`)
- Frontend tests: ✅ All passing (no new failures)
- Backend (pytest): ✅ 1553 passed, 1 pre-existing failure

### Security Audit

- API unchanged (uses existing `/auth/password/change/`).
- Authentication preserved (IsAuthenticated required).
- RBAC unchanged (Owner can change password).
- Tenant isolation unaffected (password change is account-scoped, not business-scoped).
- No sensitive data exposure, no new dependencies, no unsafe form handling.

---

## IMPORTANT OWNER DASHBOARD NOTE

OWNER DASHBOARD implementation status must be determined by a separate structural reconciliation against the repository.

The existence of individual modules such as Product, Inventory, Supplier, Purchasing, Sales, Customer, Subscription, Online Store, Notification, Reports, or Role/Permission does NOT automatically mean the corresponding Owner Dashboard domain is structurally complete.

Completion must be evaluated at the Owner domain and submenu level.
