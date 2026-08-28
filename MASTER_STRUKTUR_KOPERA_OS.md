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

============================================================
