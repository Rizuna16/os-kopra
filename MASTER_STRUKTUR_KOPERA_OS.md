============================================================
MASTER STRUKTUR KOPERA OS
============================================================

BRAND
KOPERA

PRODUK
KOPERA OS

TARGET
Retail Indonesia

KONSEP
Operating System untuk mengelola berbagai jenis usaha retail.

BAHASA UTAMA
Python

FRAMEWORK
Django

DATABASE
PostgreSQL

ENVIRONMENT
Docker

============================================================

1. # STRUKTUR AKUN

ACCOUNT
│
└── OWNER
│
├── USAHA 1
│ │
│ ├── LOKASI
│ ├── USER
│ ├── PRODUK
│ ├── INVENTORY
│ ├── PEMBELIAN
│ ├── PENJUALAN
│ ├── SUPPLIER
│ ├── PELANGGAN
│ ├── KEUANGAN
│ ├── PEGAWAI
│ ├── LAPORAN
│ └── FITUR KHUSUS USAHA
│
├── USAHA 2
│ └── struktur yang sama
│
└── USAHA 3
└── struktur yang sama

CONTOH:

OWNER
BUDI
│
├── 👕 BUDI FASHION
│
├── 🔧 BUDI BENGKEL
│
└── 🍎 BUDI BUAH

============================================================ 2. DASHBOARD UTAMA OWNER
============================================================

OWNER LOGIN
│
▼
KOPERA OS
│
├── Semua Usaha
│
├── Budi Fashion
│
├── Budi Bengkel
│
└── Budi Buah

DASHBOARD "SEMUA USAHA":

- Total omzet
- Total keuntungan
- Total transaksi
- Total pengeluaran
- Total stok
- Performa setiap usaha
- Notifikasi
- Aktivitas

Jika memilih satu usaha:

BUDI FASHION

Dashboard hanya menampilkan data Budi Fashion.

============================================================ 3. KONSEP USAHA
============================================================

1 ACCOUNT
↓
BISA MEMILIKI
↓
BANYAK USAHA

1 USAHA
↓
BISA MEMILIKI
↓
BANYAK LOKASI

Contoh:

BUDI
│
├── BUDI FASHION
│ ├── Dago
│ └── Antapani
│
├── BUDI BENGKEL
│ └── Bandung
│
└── BUDI BUAH
└── Garut

============================================================ 4. MODUL INTI SEMUA USAHA
============================================================

Modul berikut tersedia sebagai fondasi:

1.  Dashboard
2.  Business Management
3.  User
4.  Role & Permission
5.  Location
6.  Product
7.  Inventory
8.  Supplier
9.  Purchasing
10. Penjualan
11. Customer
12. Finance
13. Employee
14. Reports
15. Notification
16. Subscription
17. Payment
18. Integration
19. Security
20. Audit Log

============================================================ 5. FITUR KHUSUS BERDASARKAN JENIS USAHA
============================================================

KOPERA TIDAK MEMBUAT APLIKASI BERBEDA.

KOPERA MENGAKTIFKAN MODUL SESUAI JENIS USAHA.

---

## A. FASHION

Fitur inti:

- Produk
- Inventory
- Pembelian
- Penjualan
- Supplier
- Customer
- Finance
- Reports

Fitur khusus:

- Ukuran
- Warna
- Varian
- Koleksi
- SKU fashion
- Size chart
- Produk berdasarkan ukuran

---

## B. BENGKEL

Fitur inti:

- Produk
- Inventory
- Pembelian
- Penjualan
- Supplier
- Customer
- Finance
- Reports

Fitur khusus:

- Kendaraan
- Nomor polisi
- Merk kendaraan
- Model kendaraan
- Kilometer
- Service
- Sparepart
- Mekanik
- Work order
- Riwayat service
- Estimasi biaya
- Catatan kendaraan

---

## C. TOKO BUAH

Fitur inti:

- Produk
- Inventory
- Pembelian
- Penjualan
- Supplier
- Customer
- Finance
- Reports

Fitur khusus:

- Berat
- Kilogram
- Gram
- Timbangan
- Produk mudah rusak
- Expired
- Penyusutan
- Harga berdasarkan berat

---

## D. TOKO BANGUNAN

Fitur khusus:

- Satuan
- Konversi satuan
- Meter
- Batang
- Sak
- Dus
- PCS
- Berat
- Volume
- Harga berdasarkan satuan

---

## E. ELEKTRONIK

Fitur khusus:

- Serial number
- IMEI
- Garansi
- Distributor
- Nomor model
- Riwayat produk

============================================================ 6. SISTEM MODUL DINAMIS
============================================================

Saat owner membuat usaha:

"Jenis usaha?"

     ↓

Fashion
Bengkel
Buah
Bangunan
Elektronik
Sembako
Kosmetik
Dll.

KOPERA kemudian mengaktifkan fitur yang sesuai.

CONTOH:

BUDI FASHION
│
├── Dashboard
├── Produk
├── Inventory
├── Pembelian
├── Penjualan
├── Customer
├── Supplier
├── Finance
├── Reports
└── Fashion

BUDI BENGKEL
│
├── Dashboard
├── Sparepart
├── Inventory
├── Pembelian
├── Penjualan
├── Customer
├── Supplier
├── Finance
├── Reports
└── Bengkel

BUDI BUAH
│
├── Dashboard
├── Produk
├── Inventory
├── Pembelian
├── Penjualan
├── Customer
├── Supplier
├── Finance
├── Reports
└── Buah

============================================================ 7. SUBSCRIPTION
============================================================

ACCOUNT
Budi
│
├── Budi Fashion
│ └── Subscription
│
├── Budi Bengkel
│ └── Subscription
│
└── Budi Buah
└── Subscription

ATURAN:

1 Account
→ Banyak usaha

1 Usaha
→ 1 subscription

1 Usaha
→ Banyak lokasi

Dashboard tetap satu.

Subscription tetap berdasarkan usaha.

============================================================ 8. STRUKTUR PEMBANGUNAN WEBSITE
============================================================

KOPERA OS dibangun secara bertahap:

PART 01
Landing Page

PART 02
Register & Login

PART 03
Onboarding

PART 04
Account & Business

PART 05
Dashboard

PART 06
Business Management

PART 07
User & Permission

PART 08
Location

PART 09
Product

PART 10
Inventory

PART 11
Supplier

PART 12
Purchasing

PART 13
Penjualan

PART 14
Customer

PART 15
Promotion & Loyalty

PART 16
Finance

PART 17
Employee

PART 18
Reports & Analytics

PART 19
Notification

PART 20
Subscription

PART 21
Payment

PART 22
Online Store

PART 23
API & Integration

PART 24
KOPERA AI

PART 25
Admin KOPERA
PART 26
Security, Backup & Monitoring

============================================================ 9. CARA MENGERJAKAN SETIAP PART
============================================================

Setiap PART wajib dibedah:

1. Tujuan
2. Halaman
3. Menu
4. UI
5. Tombol
6. Form
7. User Flow
8. Business Logic
9. Database
10. Django Model
11. Backend
12. API
13. Permission
14. Validation
15. Error Handling
16. Security
17. Testing
18. Integrasi
19. Status selesai

============================================================ 10. ARSITEKTUR TEKNIS
============================================================

USER
↓
WEB
↓
HTML
CSS
JavaScript
↓
DJANGO / PYTHON
↓
BUSINESS LOGIC
↓
API
↓
POSTGRESQL
↓
STORAGE
↓
BACKUP

DOCKER
digunakan untuk environment dan deployment.

============================================================ 11. PRINSIP UTAMA
============================================================

- Tidak menggunakan istilah POS.
- Modul utama penjualan disebut PENJUALAN.
- Satu akun dapat memiliki banyak usaha.
- Satu dashboard dapat mengelola banyak usaha.
- Setiap usaha mempunyai data terpisah.
- Setiap usaha mempunyai subscription sendiri.
- Satu usaha dapat memiliki banyak lokasi.
- Fitur inti digunakan bersama.
- Fitur khusus aktif berdasarkan jenis usaha.
- Jangan membuat aplikasi terpisah untuk setiap jenis retail.
- Sistem harus modular.
- Sistem harus scalable.
- Security dibuat sejak awal.
- Audit log dibuat sejak awal.
- Python menjadi bahasa utama.
- Django menjadi framework utama.
- PostgreSQL menjadi database utama.
- Tidak bergantung pada TypeScript / Next.js.

============================================================ 12. CONTOH AKHIR
============================================================

BUDI
│
└── KOPERA OS
│
├── SEMUA USAHA
│ ├── Total omzet
│ ├── Total laba
│ └── Ringkasan semua bisnis
│
├── 👕 BUDI FASHION
│ ├── Produk
│ ├── Inventory
│ ├── Pembelian
│ ├── Penjualan
│ ├── Customer
│ ├── Supplier
│ ├── Finance
│ ├── Reports
│ └── Fitur Fashion
│
├── 🔧 BUDI BENGKEL
│ ├── Sparepart
│ ├── Inventory
│ ├── Pembelian
│ ├── Penjualan
│ ├── Customer
│ ├── Supplier
│ ├── Finance
│ ├── Reports
│ └── Fitur Bengkel
│
└── 🍎 BUDI BUAH
├── Produk
├── Inventory
├── Pembelian
├── Penjualan
├── Customer
├── Supplier
├── Finance
├── Reports
└── Fitur Buah

============================================================
STATUS KOPERA
============================================================

BRAND : KOPERA
PRODUK : KOPERA OS
TARGET : RETAIL INDONESIA
MODEL : SaaS / Subscription
LANGUAGE : Python
FRAMEWORK : Django
DATABASE : PostgreSQL
CONTAINER : Docker
PART : 25
STATUS : DESAIN / BLUEPRINT
CODING : BELUM DIMULAI

LANGKAH BERIKUTNYA:

BEDAH PART 01
LANDING PAGE

Jangan coding sebelum desain PART yang bersangkutan
sudah disepakati.

---

IMPLEMENTASI HISTORIS (PARALLEL DENGAN BLUEPRINT):

PART 15 PROMOTION & LOYALTY: 🟢 SELESAI & LOCKED.

- Dua domain (Promotion, Loyalty) dalam satu modul `apps/promotion_loyalty`.
- Business-owned, business-wide; tidak per-Location; tidak Account-global.
- Bergantung pada PART 12 SALES Amendment v1 (LOCKED, additive):
  sale.customer, sale.loyalty_earned, saleline.applied_promotion +
  snapshot discount_type/value pada transisi COMPLETED.
- Tidak mengubah PART 8 Product/Variant atau PART 14 Customer.
- Finance (PART 16) tetap blueprint masa depan.
- Kontrak v1 + Amendment v1 + implementation: LOCKED.

PART 26 AMENDMENT / CONTRACT LOCK #6 AUTHORIZATION ENGINE CONSOLIDATION: 🟢 SELESAI & LOCKED.
- Konsolidasi total logic otorisasi menjadi satu engine tunggal.
- Integrasi `BusinessAccessMixin`, `require_object_permission`, `filter_visible_businesses`, dan platform superuser bypass.
- Invariant keamanan dikunci: INV-AUTH-16 s/d INV-AUTH-23.

PART 12 SALES EXTENSION — KASIR
STATUS: LOCKED
- Modul KASIR sebagai ekstensi dari PART 12 SALES (`apps.sales`).
- Termasuk CashierShift (buka shift, daftar shift, tutup shift, rekonsiliasi kas modal awal + penjualan tunai aktual vs selisih kas).
- Transaksi Penjualan dengan `payment_method` (CASH, QRIS, TRANSFER) dan status operasional HELD (Tahan Transaksi / Lanjutkan Transaksi).
- Active-shift requirement eksplisit untuk peran KASIR.
- HELD ownership protection & security boundary.
- Tenant & location isolation yang ketat (BusinessAccessMixin, business__owner).
- Authorization boundary: KASIR memiliki hak akses terbatas sesuai matriks RBAC.

CONTRACT LOCK #7 / GREEN #7 — ANALYTICS / REPORTING / AI BUSINESS-VISIBILITY CONSOLIDATION: 🟢 SELESAI & LOCKED.
- Analytics/Reporting/AI business-visibility consolidation completed.
- `gather_facts(user)` uses canonical `filter_visible_businesses(Business.objects.all(), user)`.
- AI remains strictly OWNER-ONLY; ADMIN, KASIR, and non-owning Super Admin receive no AI facts/access.
- Owner-only filtering occurs after canonical visibility (`owned_businesses = [b for b in visible_businesses if b.owner_id == user.id]`).
- No "ai" entry added to `ROLE_PERMISSIONS`.
- `apps/reports/views.py` orphaned `get_owned_business()` removed.
- Report views continue using `BusinessAccessMixin` + `require_business_permission("reports", "view")`.
- Invariants keamanan baru dikunci: INV-AUTH-24 s/d INV-AUTH-27.

CONTRACT LOCK #8 / RED #8 — NOTIFICATION BUSINESS-SCOPED + RECIPIENT-SCOPED ACCESS CONTRACT: 🟢 SELESAI & LOCKED.
- Notifikasi di-lock pada akses business-scoped + recipient-scoped.
- Semua akses via BusinessAccessMixin + require_business_permission(notification, view) (owner OR ADMIN/KASIR member).
- Notification.recipient == request.user; cross-user / cross-business → 404.
- Hanya mutasi klien yang didukung: PATCH .../notifications/{id}/read/ (is_read False→True, idempoten).
- RED #8: NO RED REQUIRED — existing 17 tests already encode semua invariants; tidak ada production gap.
- Invariant keamanan dikunci: INV-NOTIF-1 s/d INV-NOTIF-4.
- Non-goals eksplisit: Event Store / Event Bus / Celery / Redis / WebSocket / SSE / Push / webhook / async processing / auto cross-domain event→notification. Istilah Event Architecture tidak didokumentasikan sebagai terimplementasi.

00 KOPERA PLATFORM / SUPER ADMIN — FRONTEND: 🟢 SELESAI & LOCKED.
- Platform-level admin dashboard diimplementasikan di frontend (React + TypeScript).
- Boundary route khusus `/platform-admin` (terpisah dari tenant `/admin`).
- Shell khusus `PlatformLayout` dengan identitas "KOPERA PLATFORM / SUPER ADMIN".
- Otoritas tunggal tetap server-side `IsSuperAdmin` (`request.user.is_superuser == True`).
- Tanpa BusinessContext, tanpa BusinessSelector, tanpa LocationSelector, tanpa dependensi tenant business_id.
- Tanpa role BusinessMembership baru, tanpa polusi hierarchy, tanpa apps/superadmin.
- Route frontend: /platform-admin, /platform-admin/dashboard, /platform-admin/businesses, /platform-admin/businesses/:businessId, /platform-admin/audit-logs, /platform-admin/backups.
- Backend API: GET /api/v1/admin/monitoring/, GET /api/v1/admin/businesses/, GET /api/v1/admin/businesses/<uuid>/, GET /api/v1/admin/audit-logs/, GET /api/v1/admin/audit-logs/<uuid>/, GET /api/v1/admin/backups/, POST /api/v1/admin/backups/trigger/, POST /api/v1/admin/backups/<id>/restore/.
- Tidak didukung (eksplisit tidak diimplementasikan): platform revenue/financials, plans & pricing, billing transactions, support tickets, platform configuration/settings.
- Contract/Regression/Security/Structural: PASS. Tidak ada modifikasi backend diperlukan.

17 ROLE & PERMISSION (FRONTEND MANAGEMENT UI): 🟢 SELESAI & LOCKED.
- Halaman UI khusus `/roles` diimplementasikan di bawah BusinessContext & AppLayout tenant.
- Matriks izin akses ditampilkan secara read-only (tidak ada custom editor atau custom toggles di frontend).
- Pengguna dengan hak Owner dapat menugaskan anggota baru dan memperbarui peran anggota secara langsung via form / selector.
- Peran yang dapat ditugaskan dibatasi hanya ADMIN dan KASIR.
- GUDANG: DEFERRED. Peran GUDANG tidak didukung sebagai pilihan assignable role di frontend, tidak ada di BusinessMembership.Role di backend, dan tidak dimasukkan dalam matriks izin operasional V1.
- Endpoint Role Update API backend: PATCH `/api/v1/businesses/<uuid:business_id>/members/<uuid:user_id>/` dengan aturan ketat:
  - Owner + ADMIN/KASIR -> 200
  - Non-owner -> 404
  - Cross-business -> 404
  - Nonexistent target/business -> 404
  - Owner target -> 404
  - Invalid role -> 400
  - Unauthenticated -> 401
- Keamanan & Otorisasi: tenant isolation, IDOR protection, owner immutability, Super Admin separation, GUDANG protection, KASIR protection, Platform protection.
- Contract/Regression/Security/Structural: PASS. Zero findings.

============================================================

PLATFORM KOPERA � STRUKTUR SUPER ADMIN (P1 COMMERCIAL FOUNDATION):
- PLATFORM KOPERA berada di level sistem (terpisah mutlak dari tenant / OWNER / ADMIN / KASIR).
- Otoritas: IsSuperAdmin (request.user.is_authenticated == True AND request.user.is_superuser == True).
- Struktur:
  PLATFORM KOPERA
  +-- SUPER ADMIN
      +-- 01. SUPER ADMIN DASHBOARD (Domain 01 - LOCKED)
      |   +-- platform dashboard (GET /api/v1/admin/dashboard/)
      |   +-- 7 metrik platform (total_accounts, total_owners, total_businesses, total_users, active_subscriptions, revenue_summary, system_status)
      |   +-- read-only (tidak ada mutasi POST/PUT/PATCH/DELETE)
      |   +-- audit event server-generated: DASHBOARD_VIEWED
      |   +-- platform aggregation hanya untuk Super Admin
      +-- 02. ACCOUNT MANAGEMENT (Domain 02 - LOCKED)
      |   +-- account list (GET /api/v1/admin/accounts/)
      |   +-- account detail (GET /api/v1/admin/accounts/<uuid:owner_user_id>/)
      |   +-- logical Account = owner User yang memiliki businesses
      |   +-- owner identity summary, business aggregation, user aggregation, subscription summary
      |   +-- read-only (tidak ada mutasi POST/PUT/PATCH/DELETE)
      |   +-- audit event server-generated: ACCOUNT_LIST_VIEWED, ACCOUNT_DETAIL_VIEWED
      |   +-- platform aggregation hanya untuk Super Admin
      |   +-- TIDAK membuat physical Account model
      +-- 03. OWNER MANAGEMENT (Domain 03 - LOCKED)
      |   +-- owner list (GET /api/v1/admin/owners/)
      |   +-- owner detail (GET /api/v1/admin/owners/<uuid:owner_id>/)
      |   +-- owner identity (id, email, first_name, last_name)
      |   +-- owner status (is_active, is_email_verified)
      |   +-- business aggregation, subscription summary
      |   +-- read-only (tidak ada mutasi POST/PUT/PATCH/DELETE)
      |   +-- audit event server-generated: OWNER_LIST_VIEWED, OWNER_DETAIL_VIEWED
      |   +-- platform aggregation hanya untuk Super Admin
      |   +-- Owner adalah User pemilik usaha (bukan physical model)
      |   +-- Domain 02 Account != Domain 03 Owner; Domain 03 != Domain 04 Business; Domain 03 != Domain 05 User
      +-- 04. BUSINESS / USAHA MANAGEMENT (Domain 04 - LOCKED)
      |   +-- business list (GET /api/v1/admin/businesses/)
      |   +-- business detail (GET /api/v1/admin/businesses/<uuid:business_id>/)
      |   +-- required fields: id, name, status, owner_id, subscription_status
      |   +-- status: ONBOARDING, ACTIVE, SUSPENDED, CLOSED
      |   +-- read-only (tidak ada mutasi POST/PUT/PATCH/DELETE)
      |   +-- audit event server-generated: BUSINESS_LIST_VIEWED, BUSINESS_DETAIL_VIEWED
      |   +-- platform aggregation (Business.objects.all()) hanya untuk Super Admin
      |   +-- Domain 02 Account != Domain 04 Business; Domain 03 Owner != Domain 04 Business; Domain 04 != Domain 05 User; Domain 04 != Domain 06 Subscription; Domain 04 != Domain 07 Payment
      +-- 05. USER / EMPLOYEE MANAGEMENT (Domain 05 - LOCKED)
      |   +-- user list (GET /api/v1/admin/users/)
      |   +-- user detail (GET /api/v1/admin/users/<uuid:user_id>/)
      |   +-- required fields: id, email, first_name, last_name, is_active, is_staff, is_superuser, is_email_verified, created_at
      |   +-- detail relationship: accessible_businesses, memberships [{business_id, role}], employee_info
      |   +-- read-only (tidak ada mutasi POST/PUT/PATCH/DELETE)
      |   +-- audit event server-generated: USER_LIST_VIEWED, USER_DETAIL_VIEWED
      |   +-- platform aggregation (User.objects.all()) hanya untuk Super Admin
      |   +-- OWNER/ADMIN/KASIR = tenant role (BusinessMembership); SUPER ADMIN = platform level (is_superuser)
      |   +-- Domain 02 Account != Domain 05 User; Domain 03 Owner != Domain 05 User; Domain 04 Business != Domain 05 User
      +-- 06. SUBSCRIPTION & PLAN (Domain 06 - LOCKED)
      +-- 07. PAYMENT & BILLING (Domain 07 - LOCKED)
      |   +-- payment oversight (GET /api/v1/admin/payments/)
      |   +-- payment detail (GET /api/v1/admin/payments/<id>/)
      |   +-- billing summary (GET /api/v1/admin/billing/summary/)
      |   +-- read-only payment inspection (tidak ada mutasi status)
      |   +-- no manual payment status mutation (Midtrans/webhook = source of truth)
      |   +-- platform aggregation hanya untuk Super Admin
+-- 08. SUPPORT CENTER (Domain 08 - LOCKED)
       |   +-- platform-level Super Admin support ticketing (SupportTicket / TicketReply)
       |   +-- ticket list (GET /api/v1/admin/support/tickets/)
       |   +-- ticket detail (GET /api/v1/admin/support/tickets/<uuid:ticket_id>/)
       |   +-- ticket replies (GET /api/v1/admin/support/tickets/<uuid:ticket_id>/replies/)
       |   +-- ticket mutation (PATCH status/priority only; POST reply only)
       |   +-- requester/author = request.user server-side (no client spoofing)
       |   +-- audit event server-generated: SUPPORT_TICKET_LIST_VIEWED, SUPPORT_TICKET_DETAIL_VIEWED, SUPPORT_TICKET_UPDATED, SUPPORT_TICKET_REPLIED
       |   +-- Domain 08 != Domain 09 Notification; Domain 08 != Domain 13 Audit Log; AuditLog = side-effect/infrastructure only
       +-- 09. NOTIFICATION (Domain 09 - LOCKED)
       |   +-- in-app business-scoped notifications (Notification model)
       |   +-- notification list (GET /api/v1/businesses/<uuid:business_id>/notifications/)
       |   +-- notification detail (GET /api/v1/businesses/<uuid:business_id>/notifications/<uuid:notification_id>/)
       |   +-- notification mark-read (PATCH /api/v1/businesses/<uuid:business_id>/notifications/<uuid:notification_id>/read/)
       |   +-- recipient isolation: recipient=request.user enforced server-side
       |   +-- business isolation: BusinessAccessMixin + recipient scope
       |   +-- read-state mutation: is_read only, hard-set True server-side
       |   +-- in-app only: YES (no push / email / SMS / event bus / scheduler / queue)
       |   +-- response fields: id, type, title, message, is_read, created_at
       |   +-- authorization: IsAuthenticated + BusinessAccessMixin (require_business_permission("notification", "view"))
       |   +-- audit event server-generated: NOTIFICATION_LIST_VIEWED, NOTIFICATION_DETAIL_VIEWED, NOTIFICATION_READ
       |   +-- Domain 09 != Domain 08 Support Center; Domain 09 != Domain 13 Audit Log; Domain 09 != Domain 05 User Management
       +-- 18. KOPERA ADMIN MANAGEMENT
- Domain 01 Super Admin Dashboard (PART 29 - P1 Commercial Foundation): LOCKED.
  - Platform-level dashboard bersifat READ-ONLY (GET /api/v1/admin/dashboard/).
  - Menampilkan 7 metrik platform: total_accounts, total_owners, total_businesses, total_users, active_subscriptions, revenue_summary, system_status.
  - Anonymous -> 401; Owner/Admin/Kasir/non-superuser staff -> 403; Super Admin -> 200.
  - POST/PUT/PATCH/DELETE -> 405/403 (read-only enforcement).
  - Audit event server-generated: DASHBOARD_VIEWED.
  - Tidak ada modifikasi backend lain; frontend route /platform-admin/dashboard.
- Domain 02 Account Management (PART 29 - P1 Commercial Foundation): LOCKED.
  - Platform-level account oversight bersifat READ-ONLY (GET /api/v1/admin/accounts/, /{owner_user_id}/).
  - Logical Account = owner User yang memiliki businesses; TIDAK ada physical Account model.
  - Owner identity summary, business aggregation, user aggregation, subscription summary.
  - Anonymous -> 401; Owner/Admin/Kasir/non-superuser staff -> 403; Super Admin -> 200.
  - POST/PUT/PATCH/DELETE -> 405/403 (read-only enforcement).
  - Audit event server-generated: ACCOUNT_LIST_VIEWED, ACCOUNT_DETAIL_VIEWED.
  - Domain 03 Owner, 04 Business, 05 User, 06 Subscription, 07 Payment tetap terpisah; finance.models.Account BUKAN Platform Account.
  - Frontend route /platform-admin/accounts, /:ownerUserId.
- Domain 03 Owner Management (PART 29 - P1 Commercial Foundation): LOCKED.
  - Platform-level owner oversight bersifat READ-ONLY (GET /api/v1/admin/owners/, /{owner_id}/).
  - Owner = User pemilik usaha dilihat di level identitas/status individu; TIDAK ada physical Owner model.
  - Owner identity (id, email, first_name, last_name), status (is_active, is_email_verified), business aggregation, subscription summary.
  - Anonymous -> 401; Owner/Admin/Kasir/non-superuser staff -> 403; Super Admin -> 200.
  - POST/PUT/PATCH/DELETE -> 405/403 (read-only enforcement).
  - Audit event server-generated: OWNER_LIST_VIEWED, OWNER_DETAIL_VIEWED.
  - Domain 02 Account != Domain 03 Owner; Domain 03 != Domain 04 Business; Domain 03 != Domain 05 User.
  - Frontend route /platform-admin/owners, /:ownerId.
- Domain 04 Business Management (PART 29 - P1 Commercial Foundation): LOCKED.
  - Platform-level business oversight bersifat READ-ONLY (GET /api/v1/admin/businesses/, /{business_id}/).
  - Required fields: id, name, status, owner_id, subscription_status (ONBOARDING/ACTIVE/SUSPENDED/CLOSED).
  - Subscription status diturunkan dari related Subscription.
  - Platform-wide scope (Business.objects.all()) — TIDAK difilter oleh owner.
  - Anonymous -> 401; Owner/Admin/Kasir/non-superuser staff -> 403; Super Admin -> 200.
  - POST/PUT/PATCH/DELETE -> 405/403 (read-only enforcement).
  - TIDAK ada business creation/update/deletion/suspension/search/filter/pagination pada kontrak platform ini.
  - Audit event server-generated: BUSINESS_LIST_VIEWED, BUSINESS_DETAIL_VIEWED.
  - Domain 02 Account != Domain 04 Business; Domain 03 Owner != Domain 04 Business; Domain 04 != Domain 05 User; Domain 04 != Domain 06 Subscription; Domain 04 != Domain 07 Payment.
  - Frontend route /platform-admin/businesses, /:businessId.
- Domain 05 User Management (PART 29 - P1 Commercial Foundation): LOCKED.
  - Platform-level user oversight bersifat READ-ONLY (GET /api/v1/admin/users/, /{user_id}/).
  - Required fields: id, email, first_name, last_name, is_active, is_staff, is_superuser, is_email_verified, created_at.
  - Detail relationship: accessible_businesses, memberships [{business_id, role}], employee_info.
  - Platform-wide scope (User.objects.all()) — mencakup SEMUA user (owner, admin, kasir, staff, superuser).
  - OWNER/ADMIN/KASIR = tenant role via BusinessMembership; SUPER ADMIN = platform level via User.is_superuser (BUKAN tenant role).
  - Anonymous -> 401; Owner/Admin/Kasir/non-superuser staff -> 403; Super Admin -> 200.
  - POST/PUT/PATCH/DELETE -> 405/403 (read-only enforcement).
  - TIDAK ada search/filter/pagination pada kontrak platform V1/P0 ini.
  - Audit event server-generated: USER_LIST_VIEWED, USER_DETAIL_VIEWED.
  - Domain 02 Account != Domain 05 User; Domain 03 Owner != Domain 05 User; Domain 04 Business != Domain 05 User.
  - Frontend route /platform-admin/users, /:userId.
- Domain 07 Payment & Billing (PART 29 - P1 Commercial Foundation): LOCKED.
  - Payment oversight bersifat READ-ONLY (list / detail).
  - Billing summary menghitung realized revenue HANYA dari status PAID.
  - Tidak ada endpoint POST/PUT/PATCH/DELETE payment.
  - Midtrans webhook tetap satu-satunya sumber kebenaran status payment.
- Domain 11 Feature & Module Management (PART 29 - P1 Commercial Foundation): LOCKED.
  - Platform-level feature/module toggles bersifat Super Admin only.
  - List platform features (GET /api/v1/admin/platform/features/).
  - Feature detail (GET /api/v1/admin/platform/features/{feature_id}/).
  - Enable feature (POST /api/v1/admin/platform/features/{feature_id}/enable/).
  - Disable feature (POST /api/v1/admin/platform/features/{feature_id}/disable/).
  - IsSuperAdmin authorization enforced on all endpoints.
  - Platform-wide state: No business_id required; no tenant/business context.
  - Anonymous -> 401; Owner/Admin/Kasir/non-superuser staff -> 403; Super Admin -> 200.
  - No mass assignment; no arbitrary field modification through toggle endpoints.
  - Invalid/nonexistent feature -> safe 404 behavior.
  - No dependency/configuration engine accidentally exposed.
  - Audit event server-generated: FEATURE_LIST_VIEWED, FEATURE_DETAIL_VIEWED, FEATURE_ENABLED, FEATURE_DISABLED.
  - Separate from Domain 10: Domain 10 has full CRUD on modules/features with business overrides; Domain 11 is platform-wide toggle only.
  - Frontend route /platform-admin/platform/features.
  - Tenant billing ownership, Midtrans webhook behavior, Domain 06, dan Domain 10 tidak diubah.
  - Audit event server-generated: PAYMENT_LIST_VIEWED, PAYMENT_DETAIL_VIEWED, BILLING_SUMMARY_VIEWED.
