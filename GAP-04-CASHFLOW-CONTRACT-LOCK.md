# GAP-04DASH-CASHFLOW — CONTRACT LOCK (AMENDMENT #1)

**Status:** 🔒 CONTRACT LOCKED (Amendment #1 Final — Ready for Human Approval / RED Phase)  
**Module Domain:** `apps/reports/` & `frontend/src/pages/ReportsCashflow.tsx` (or integrated in `ReportsFinance.tsx`)  
**Parent Contracts:** GAP-01DASH-LABA, GAP-02 PIUTANG, GAP-03 HUTANG, KOPERA_OS_MASTER.md, MASTER_STRUKTUR_KOPERA_OS.md, STRUKTUR_OWNER.md  
**Date:** 2026-09-02  
**Baseline Commit:** `1183a7131e6be64dcda7067a1596abef0ac67348`

---

## A. CONTRACT IDENTITY

* **GAP ID:** `GAP-04DASH-CASHFLOW`
* **Domain:** Keuangan / Arus Kas Operasional (Operational Cash Flow)
* **Structural Location:** Domain 5 (KEUANGAN) → Submenu 5.5 `Cash Flow` (STRUKTUR_OWNER.md)
* **Status:** 🔒 CONTRACT LOCKED (Amendment #1)
* **Baseline Commit:** `1183a7131e6be64dcda7067a1596abef0ac67348` (origin/main synced, clean working tree)

---

## B. PURPOSE

GAP-04DASH-CASHFLOW memberikan kemampuan KOPERA OS untuk:
- Menyajikan **Laporan Arus Kas Operasional (cash-basis)** yang akurat dan *real-time* bagi Owner dan Admin.
- Menghitung **Total Cash Inflow** dari Penjualan Tunai POS (`Sale` non-kredit) dan Pelunasan Piutang (`PaymentAllocation` GAP-02).
- Menghitung **Total Cash Outflow** dari Pembayaran Hutang Supplier (`SupplierPaymentAllocation` GAP-03) dan Operasional Bisnis (`Expense` Finance).
- Menyajikan **Net Cash Flow** ($\text{Inflow} - \text{Outflow}$) secara transparan tanpa mengaburkan arus kas dengan metrik akrual (*Revenue*, *Gross Profit*, *Net Profit*).
- Menghindari **double counting** pada transaksi kredit yang memiliki uang muka (DP).
- Menangani **pembatalan/reversal** alokasi pembayaran dan **void penjualan** lintas periode secara *audit-safe*.
- Membatasi akses laporan khusus untuk role `OWNER` dan `ADMIN`, secara ketat menolak `KASIR` (HTTP 403).

---

## C. FORMAL BUSINESS DEFINITION

Arus Kas (Cash Flow) KOPERA OS didefinisikan secara tegas sebagai **Laporan Arus Kas Operasional berbasis kas (Cash-Basis)** yang dihitung dari pergerakan uang aktual (*actual cash movement*) akibat *event* bisnis operasional yang terjadi selama periode laporan.

$$\text{NET CASH FLOW} = \text{TOTAL CASH INFLOW} - \text{TOTAL CASH OUTFLOW}$$

### Perbedaan Eksplisit dari Metrik Lain (DILARANG DICAMPUR):
- **Cash Flow ≠ Revenue**: Revenue mencakup seluruh transaksi penjualan completed (termasuk penjualan kredit yang belum ditagih). Cash Flow HANYA menghitung uang yang benar-benar diterima.
- **Cash Flow ≠ Gross Profit**: Gross Profit = Revenue − COGS (accrual-basis). Cash Flow tidak memperhitungkan HPP/COGS melainkan arus uang tunai aktual.
- **Cash Flow ≠ Net Profit**: Net Profit = Gross Profit − Total Expense (accrual-basis). Cash Flow tidak memperhitungkan depresiasi atau amortisasi akrual.
- **Cash Flow ≠ Saldo Piutang / Hutang**: Saldo Piutang/Hutang adalah hak/kewajiban tagihan (outstanding balance), bukan arus kas masuk/keluar.
- **Cash Flow ≠ Saldo Buku / Rekonsiliasi Bank**: Cash Flow adalah laporan pergerakan arus kas operasional internal bisnis, BUKAN *engine* rekonsiliasi bank atau pencatatan saldo akhir bank.

---

## D. CASH INFLOW CONTRACT

Arus Kas Masuk (Cash Inflow) terdiri dari 2 sumber event bisnis operasional:

### 1. Penjualan Tunai POS Regular (Non-Kredit)
- **Kriteria Query:** `Sale.objects.filter(business=business, status=Sale.Status.COMPLETED, receivable__isnull=True, payment_method__in=['CASH', 'QRIS', 'TRANSFER'])`
- **Tanggal Gerak Kas:** `Sale.created_at`
- **Nominal Kas:** $\sum (\text{SaleLine.quantity} \times \text{SaleLine.unit\_price})$
- **Pengecualian:** Transaksi kredit (`receivable__isnull=False`) **DILARANG** dimasukkan dalam query `Sale` ini untuk mencegah double counting.

### 2. Penerimaan Pelunasan Piutang Pelanggan (GAP-02) & Reversal Semantics (AMENDED)

- `is_reversed=False` **TIDAK BOLEH** menjadi filter tunggal yang menghapus data historis dari pergerakan arus kas.
- **Alokasi Pembayaran Normal (`is_reversed == False`):**
  - Movement Asal: `+amount` diakui pada tanggal `payment_date`.
- **Alokasi Pembayaran yang Direverse (`is_reversed == True`):**
  - Movement Asal (Historical Event): **TETAP ADA** sebesar `+amount` pada tanggal `payment_date` di laporan periode historis tersebut.
  - Movement Reversal (Pembatalan Event): Gerak kas **negatif** sebesar `-amount` diakui pada tanggal pembatalan (`reversed_at`).
  - *Data Invariant Safety:* Jika `reversed_at` bernilai `null` saat `is_reversed=True`, implementasi wajib menggunakan `updated_at` atau fallback timestamp secara aman tanpa mengarang data.

---

## E. CASH OUTFLOW CONTRACT

Arus Kas Keluar (Cash Outflow) terdiri dari 2 sumber event bisnis operasional:

### 1. Pembayaran Hutang Supplier (GAP-03) & Reversal Semantics (AMENDED)

- **Alokasi Pembayaran Supplier Normal (`is_reversed == False`):**
  - Outflow Asal: `+amount` (mengurangi kas) diakui pada tanggal `payment_date`.
- **Alokasi Pembayaran Supplier yang Direverse (`is_reversed == True`):**
  - Outflow Asal (Historical Event): **TETAP ADA** sebesar `+amount` pada tanggal `payment_date`.
  - Reversal Outflow: Gerak kas keluar **negatif** sebesar `-amount` (efektif pengembalian kas) diakui pada tanggal pembatalan (`reversed_at`).

### 2. Pengeluaran Operasional (Expense)
- **Kriteria Query:** `Expense.objects.filter(business=business, amount__gt=0)`
- **Tanggal Gerak Kas:** `Expense.created_at`
- **Nominal Kas:** `Expense.amount`

---

## F. CREDIT SALE DOUBLE COUNTING RULE

Untuk mencegah penggelembungan saldo kas palsu pada Penjualan Kredit (*Credit Sale*):

### Ilustrasi Kasus Wajib:
- **Total Penjualan Kredit:** Rp1.000.000
- **Uang Muka / DP Awal:** Rp300.000 (Metode: CASH)
- **Sisa Tagihan:** Rp700.000
- **Pelunasan Kemudian:** Rp700.000

### Aturan Arus Kas (CONTRACT MANDATE):
1. **Tanggal Transaksi Penjualan:**
   - Query `Sale` non-kredit **TIDAK** menghitung Rp1.000.000 (karena `receivable__isnull=False`).
   - Query `PaymentAllocation` (GAP-02 DP) mencatat **+Rp300.000** pada tanggal DP.
   - *Result Arus Kas Tanggal Penjualan:* **+Rp300.000**.
2. **Tanggal Pelunasan Kemudian:**
   - Query `PaymentAllocation` (GAP-02 Pelunasan) mencatat **+Rp700.000** pada tanggal pelunasan.
   - *Result Arus Kas Tanggal Pelunasan:* **+Rp700.000**.
3. **Total Akumulasi Arus Kas Masuk:** **+Rp1.000.000** (Tepat 100% nilai kas aktual).

### LARANGAN KERAS:
**DILARANG** menghitung +Rp1.000.000 dari `Sale` + +Rp300.000 dari `PaymentAllocation` DP yang akan menghasilkan total palsu Rp1.300.000.

---

## G. VOID SALE CONTRACT

Untuk Penjualan Tunai Regular (`receivable__isnull=True`):

1. **Void Periode Sama (Same-Period Void):**
   - Transaksi `Sale` dengan `status=COMPLETED` yang di-void dalam periode tanggal laporan yang sama diabaikan dari total Inflow karena query memfilter `status=COMPLETED`.
2. **Void Lintas Periode (Cross-Period Void):**
   - Transaksi `Sale` yang di-complete pada Periode A dan di-void pada Periode B:
     - Laporan Periode A **tetap mencatat** Inflow asal (+RpX).
     - Laporan Periode B mencatat **Gerak Kas Negatif** (-RpX) pada tanggal `Sale.updated_at` (saat status menjadi `VOIDED`).
3. **Audit Timestamp Repository:**
   - `Sale.updated_at` adalah satu-satunya timestamp resmi pada model `Sale` yang mencatat perubahan status ke `VOIDED`. GAP-04 menggunakan `updated_at` sebagai timestamp resmi void event tanpa menambah field baru.

---

## H. PAYMENT METHOD BOUNDARY

- Channel pembayaran yang diakui: `CASH`, `QRIS`, `TRANSFER`.
- Pada MVP GAP-04, seluruh channel pembayaran dianggap sebagai **Arus Kas Operasional langsung** pada saat event dicatat oleh pengguna.
- **EKSPLISIT DILUAR SCOPE:**
  - Bank settlement confirmation / clearing delay.
  - Payment gateway settlement reconciliation.
  - Rekonsiliasi fisik saldo kasir vs saldo bank.

---

## I. COA / LEDGER BOUNDARY

GAP-04 **TIDAK MEMBUTUHKAN** dan **TIDAK BOLEH MENGINVENT**:
- Klasifikasi akun Kas/Bank pada Chart of Accounts (`Account`).
- Otomatisasi pencatatan jurnal berpasangan (`Journal`, `JournalEntry`, `Ledger`).
- Rekonsiliasi saldo akun akuntansi.

Kalkulasi arus kas murni diambil dari *operational business events* (`Sale`, `PaymentAllocation`, `SupplierPaymentAllocation`, `Expense`).

---

## J. PERIOD CONTRACT

- GAP-04 **TIDAK MENUNGGU** dan **TIDAK MEMBUAT** generic `Period API` abstraction.
- GAP-04 memanfaatkan helper tanggal existing `parse_date_params(request)` (`date_from` dan `date_to`) dari `apps/reports/views.py`.
- Format parameter: `YYYY-MM-DD`.

---

## K. CHARTING BOUNDARY

- **GAP-04 MVP TIDAK MEMUAT TREND CHARTS / VISUALISASI GRAFIK.**
- Visualisasi grafik arus kas (`Grafik Arus Kas`) secara tegas ditangguhkan ke **`GAP-05ANALYTICS-CHARTS`**.
- Tidak ada library grafik (Recharts, Chart.js, D3, dll.) yang dipasang atau ditambah pada GAP-04.

---

## L. LOCATION CONTRACT

- **Owner / Admin:** Dapat melihat Arus Kas untuk seluruh lokasi (*All Locations*) secara default, atau memfilter berdasarkan lokasi tertentu via parameter `?location={location_id}`.
- **Kasir:** Ditolak total dari akses laporan (HTTP 403).
- **Timezone:** Menggunakan timezone server (`timezone.localdate()`) konsisten dengan GAP-02 dan GAP-03 MVP.

---

## M. ROLE MATRIX (AMENDED)

| Role | Access Cash Flow Report | Filter Location | View History Lines | Export CSV/XLSX |
|---|---|---|---|---|
| **OWNER** | ✅ YES (200 OK) | ✅ All / Specific | ✅ YES | ❌ OUT OF SCOPE |
| **ADMIN** | ✅ YES (200 OK) | ✅ All / Specific | ✅ YES | ❌ OUT OF SCOPE |
| **KASIR** | ❌ NO (HTTP 403) | ❌ Denied | ❌ Denied | ❌ OUT OF SCOPE |
| **SUPER ADMIN** | ⚪ Platform boundary | N/A | N/A | ❌ OUT OF SCOPE |

---

## N. FRONTEND CONTRACT (AMENDED)

Halaman frontend `frontend/src/pages/ReportsCashflow.tsx` (atau komponen Laporan Arus Kas) wajib menyajikan:

1. **Header & Context:** Title "Laporan Arus Kas Operasional", Subtitle, Date Range picker (`date_from` / `date_to`), Location selector (Owner/Admin).
2. **Executive Summary Cards (3 Cards):**
   - Total Cash Inflow (`data-testid="kpi-cash-inflow"`)
   - Total Cash Outflow (`data-testid="kpi-cash-outflow"`)
   - Net Cash Flow (`data-testid="kpi-net-cashflow"`) — *Warna hijau jika positif, merah jika negatif*
3. **Inflow Breakdown Card (`data-testid="breakdown-inflow"`):**
   - Penjualan Tunai POS Regular
   - Pelunasan Piutang Pelanggan (GAP-02)
4. **Outflow Breakdown Card (`data-testid="breakdown-outflow"`):**
   - Pembayaran Hutang Supplier (GAP-03)
   - Pengeluaran Operasional (Expense)
5. **Riwayat Pergerakan Kas Operasional (Table):**
   - Tanggal & Waktu (timestamp formatted)
   - Tipe Movement (Inflow / Outflow)
   - Sumber Event (POS Sale / Piutang / Hutang / Expense)
   - Referensi / Invoice #
   - Metode Pembayaran (CASH / QRIS / TRANSFER)
   - Nominal (Formatted Rupiah `id-ID`)
   - Status (Valid / Reversed / Voided Movement)
6. **States:**
   - Loading skeleton (`data-testid="cashflow-loading"`)
   - Empty state (`data-testid="cashflow-empty"`)
   - Error alert (`data-testid="cashflow-error"`)
7. **Constraints:**
   - **TIDAK ADA TOMBOL / ENDPOINT EXPORT CSV / XLSX.**
   - **TIDAK BANYAK WHITESPACE / BARE CRUD.**
   - **TIDAK ADA GRAFIK / CHART.**
   - Dilarang memodifikasi file `OwnerDashboard.tsx` atau `OwnerDashboard.test.tsx`.

---

## O. BACKEND CONTRACT

### Endpoint Tunggal GAP-04:
`GET /api/v1/businesses/{business_id}/reports/cashflow/`

- **Query Parameters:**
  - `date_from` (optional, `YYYY-MM-DD`)
  - `date_to` (optional, `YYYY-MM-DD`)
  - `location` (optional, UUID)
- **Response Structure:**
```json
{
  "summary": {
    "total_inflow": "1300000.00",
    "total_outflow": "400000.00",
    "net_cashflow": "900000.00"
  },
  "inflow_breakdown": {
    "pos_cash_sales": "1000000.00",
    "receivable_collections": "300000.00"
  },
  "outflow_breakdown": {
    "supplier_payments": "250000.00",
    "expenses": "150000.00"
  },
  "cash_movements": [
    {
      "id": "uuid",
      "date": "2026-09-02T14:30:00Z",
      "direction": "INFLOW",
      "source_type": "RECEIVABLE_PAYMENT",
      "reference": "INV-0001",
      "payment_method": "CASH",
      "amount": "300000.00",
      "is_reversal": false
    }
  ]
}
```
- **Permissions:** `IsAuthenticated` + `BusinessAccessMixin` (`require_business_permission("reports", "view")`).

---

## P. SCOPE BOUNDARY (AMENDED)

### IN SCOPE:
- Aggregasi Arus Kas Masuk (POS Cash Sales + Receivable Collections).
- Aggregasi Arus Kas Keluar (Supplier Payments + Expenses).
- Net Cash Flow calculation.
- Double-counting protection via `receivable__isnull=True`.
- Movement history table payload & UI.
- Reversal & Cross-period Void negative movement calculation.
- Date range & Location filtering.
- Owner & Admin permission gating.
- Kasir 403 denial.
- Indonesian Rupiah formatting (`id-ID`).

### OUT OF SCOPE:
- **Export CSV / XLSX data.**
- Bank account reconciliation / settlement engine.
- Payment gateway clearing tracking.
- COA account classification / type mapping.
- Automatic journal / ledger posting.
- Saldo awal kas / opening cash balance.
- Multi-currency / foreign exchange.
- Bank loan / financing cashflow.
- Tax accounting / PPN / PPh.
- Trend charts / time-series graphics (GAP-05).
- Multi-period comparison (GAP-06).
- Automated alerts / notifications (GAP-07).
- Mutasi data pada Sales, Inventory, Purchasing, Receivable, atau Payable.

---

## Q. SECURITY CONTRACT

- Scoping bisnis `business_id` **WAJIB** menggunakan server-side validation via `BusinessAccessMixin`.
- Akses lintas-bisnis (**cross-business**) wajib mengembalikan HTTP 404.
- Role `KASIR` wajib ditolak dengan HTTP 403 (`PermissionDenied`).
- Parameter `location` wajib divalidasi server-side bahwa lokasi milik bisnis yang bersangkutan.
- Tidak ada data finansial yang dapat dimodifikasi via endpoint ini (`GET` read-only).

---

## R. PROTECTED BOUNDARIES (ZERO MODIFICATION ALLOWED)

Module dan file berikut bersifat 🔒 **LOCKED** dan dilarang dimodifikasi:
- `apps/sales/`
- `apps/inventory/`
- `apps/customer/`
- `apps/business/`
- `apps/finance/`
- `apps/authentication/`
- `apps/purchasing/`
- `apps/supplier/`
- `apps/receivable/`
- `apps/payable/`
- `frontend/src/pages/OwnerDashboard.tsx`
- `frontend/src/test/OwnerDashboard.test.tsx`

---

## S. TESTING CONTRACT (AMENDED)

### Backend Tests (`apps/reports/tests/test_cashflow.py`):
1. Regular POS cash sale generates Inflow.
2. Credit sale excludes Sale total from Inflow (`receivable__isnull=True`).
3. Receivable DP & subsequent payments generate Inflow at `payment_date`.
4. Reversed receivable payment keeps original +inflow on `payment_date` and generates -inflow on `reversed_at`.
5. Supplier payment generates Outflow at `payment_date`.
6. Reversed supplier payment keeps original +outflow on `payment_date` and generates -outflow on `reversed_at`.
7. Operating Expense generates Outflow at `created_at`.
8. Cross-period void generates negative movement on void date (`updated_at`).
9. `date_from` and `date_to` filtering accuracy.
10. `location` query filtering accuracy.
11. Owner and Admin access allowed (200 OK).
12. Kasir access denied (403 Forbidden).
13. Cross-business isolation (404 Not Found).
14. Net Cash Flow calculation accuracy ($\text{Inflow} - \text{Outflow}$).

### Frontend Tests (`frontend/src/test/cashflow.test.tsx`):
1. Executive KPI cards render formatted Rupiah amounts.
2. Inflow and Outflow breakdown cards render correct categories.
3. Operational cash movement table renders row items.
4. Filter controls (`date_from`, `date_to`, `location`) execute request refetch.
5. Loading, Empty, and Error states render correctly.
6. Owner and Admin roles can access page.
7. Kasir role receives access denied / redirect.

---

## T. UI/UX CONTRACT

- Desain mengikuti KOPERA OS Tailwind CSS design language.
- Kartu KPI: Total Inflow (`text-emerald-600`), Total Outflow (`text-rose-600`), Net Cash Flow (`text-emerald-700` jika positif, `text-red-700` jika negatif).
- Layout responsif, bersih, tanpa whitespace berlebihan, tanpa bare CRUD table.
- Bebas dari komponen chart/grafik dan tombol export.

---

## U. FORBIDDEN CHANGES

- DILARANG mengubah arsitektur `Sale`, `PurchaseOrder`, `Receivable`, atau `Payable`.
- DILARANG memasukkan `PaymentAllocation` ke dalam query `Sale`.
- DILARANG membuat model database baru untuk Cashflow (Cukup query aggregasi server-side).
- DILARANG mengubah permission `KASIR` menjadi True untuk laporan.
- DILARANG memodifikasi `OwnerDashboard.tsx`.
- DILARANG menambahkan tombol atau endpoint export CSV/XLSX.

---

## V. ACCEPTANCE CRITERIA (AMENDED)

1. Formula Net Cash Flow = Total Inflow − Total Outflow divalidasi server-side.
2. Penjualan kredit tidak memicu double counting.
3. Alokasi pembayaran piutang dan utang diakui tepat pada tanggal `payment_date`.
4. Pembatalan (reversal) diakui sebagai gerak kas negatif pada `reversed_at`, dengan event asal tetap diakui pada `payment_date`.
5. Void lintas periode diakui sebagai gerak kas negatif pada `updated_at`.
6. Pengeluaran (Expense) dihitung tepat sebagai Outflow.
7. Filter tanggal dan lokasi bekerja akurat.
8. Role Owner dan Admin diizinkan; Kasir ditolak 403.
9. Isolasi tenant 100% terjaga (cross-business 404).
10. UI menyajikan KPI summary, breakdown, dan riwayat pergerakan kas tanpa chart dan tanpa export button.
11. Full regression test backend (pytest) dan frontend (vitest/typecheck/build) PASS.

---

## W. AMENDMENT RECONCILIATION

| Item | Previous Rule | Amendment | Repository Evidence | Status |
|---|---|---|---|---|
| **Reversal Query Filter** | `is_reversed=False` as single filter | Historical event preserved at `payment_date` (+amount); Reversal event added at `reversed_at` (-amount) | `PaymentAllocation` and `SupplierPaymentAllocation` have `payment_date`, `is_reversed`, and `reversed_at` | ✅ RECONCILED & LOCKED |
| **Export Feature** | "YES (if supported)" conditional scope | Explicitly **OUT OF SCOPE** for GAP-04 MVP | No export endpoints or export engine in scope | ✅ RECONCILED & LOCKED |
| **Void Timestamp** | `updated_at` | `updated_at` retained as official void timestamp | `Sale.updated_at` is the only timestamp on `Sale` model for status changes | ✅ RECONCILED & LOCKED |
| **Kasir Access** | HTTP 403 | HTTP 403 strictly retained | `ROLE_PERMISSIONS[("KASIR", "reports", "view")] = False` | ✅ RECONCILED & LOCKED |

---

## X. FINAL GATE

```text
GAP-04DASH-CASHFLOW — CONTRACT LOCK READY FOR RED
```

> **CONTRACT LOCK AMENDMENT COMPLETED — STOP.**
> **Awaiting human approval to proceed to RED phase.**
