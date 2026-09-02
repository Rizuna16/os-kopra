# GAP-02 PIUTANG — CONTRACT LOCK (AMENDMENT #3 FINAL)

## RECEIVABLE / ACCOUNTS RECEIVABLE V1

Status: 🔒 CONTRACT LOCKED (Amendment #3 Final — Ready for Human Approval)
Module Domain: `apps/receivable/` & `frontend/src/receivable/`
Parent Contracts: Core Business Architecture (§5.1), Sales Part 12, Customer Part 14, Finance Part 16, Owner Dashboard Post-V1.
Date: 2026-09-02

---

## 1. CONTRACT OBJECTIVE

GAP-02 menyediakan kemampuan KOPERA OS untuk:
- Mencatat penjualan kredit (*credit sale* / *sell now, pay later*) kepada `Customer` terdaftar.
- Menerbitkan piutang (`Receivable`) terisolasi per-bisnis dan per-lokasi yang terikat 1-to-1 dengan transaksi `Sale` berstatus `COMPLETED`.
- Menerima pembayaran parsial/bertahap (`PaymentAllocation`) secara *atomic*, *row-locked*, dan *immutable*.
- Menghitung sisa saldo tagihan (*outstanding balance*) dan saldo piutang pelanggan (*customer balance*) secara konsisten dengan saldo pembayaran valid (non-reversed).
- Mengelola siklus hidup piutang (`UNPAID`, `PARTIAL`, `PAID`, `VOIDED`, `CLOSED`).
- Mengelola pembatalan (*reversal*) pembayaran individual secara spesifik dan *audit-safe*.
- Menyediakan *visibility* piutang bagi Owner, Admin, dan Kasir sesuai matriks izin dan batas akses lokasi tanpa merusak modul yang telah terkunci.

---

## 2. EXISTING FOUNDATION & SALES + INVENTORY INTEGRATION BOUNDARY

Modul-modul berikut bersifat 🔒 **LOCKED**:
- `Customer` (`apps/customer/models.py`)
- `Sale` & `SaleLine` (`apps/sales/models.py`)
- `Inventory`: Mekanisme pemotongan stok otomatis saat `Sale.status == COMPLETED`
- `BusinessAccessMixin` & Security Engine: Isolasi tenant `business_id`
- Location Context & Scoping (`location_id`)
- System Roles: `OWNER`, `ADMIN`, `KASIR`
- Finance Foundation (`Account`, `Journal`, `JournalEntry`, `Ledger`, `Expense`)
- Pre-existing membership test failure: `TestMembershipFoundation.test_8_owner_existing_behavior_remains_intact` (400 vs 201) tetap diakui sebagai *unrelated baseline* dan **TIDAK BOLEH DIMANIPULASI/DIHAPUS/DIMASKING**.

**Sales + Inventory Integration Boundary**:
- GAP-02 **TIDAK MEMBUAT ULANG** Sales completion engine atau Inventory deduction engine.
- Existing locked mechanisms tetap menjadi source of truth. Credit Sale wajib menggunakan existing Sales transaction/completion workflow melalui extension yang kompatibel:
  - `Sale` dibuat dan di-complete melalui existing valid completion flow.
  - Inventory deduction dijalankan sekali melalui existing locked mechanism.
  - Credit-sale branch memicu pembuatan record `Receivable` dan opsional initial `PaymentAllocation` (DP) secara atomik dalam satu transaction block.
- Dilarang membuat: duplicate stock deduction, duplicate sale completion logic, perubahan pada `Sale.Status` choices existing, perubahan pada `Sale.PaymentMethod` choices existing, parallel workflow, atau bypass authorization.

---

## 3. NEW DOMAIN ARCHITECTURE & DATA RETENTION / PROTECTION

GAP-02 menambahkan dua model pada `apps/receivable/models.py`:

### 3.1. `Receivable` (Piutang)
- **PK**: `id` (UUIDField, primary_key=True, default=uuid.uuid4, editable=False)
- **Foreign Keys**:
  - `business` (FK → `Business`, on_delete=models.CASCADE, related_name="receivables")
  - `location` (FK → `Location`, on_delete=models.PROTECT, related_name="receivables") — *PROTECT mencegah kehilangan data historis finansial akibat penghapusan lokasi*
  - `customer` (FK → `Customer`, on_delete=models.PROTECT, related_name="receivables") — *PROTECT mencegah penghapusan pelanggan yang memiliki jejak piutang*
  - `sale` (OneToOneField → `Sale`, on_delete=models.PROTECT, related_name="receivable") — *1-to-1 dengan Sale*
- **Fields**:
  - `invoice_number` (CharField, max_length=100) — **WAJIB UNIK per business**
  - `original_amount` (DecimalField, max_digits=12, decimal_places=2, editable=False) — *Immutable*
  - `paid_amount` (DecimalField, max_digits=12, decimal_places=2, default=0) — *Maintained/denormalized sum of active allocations*
  - `outstanding_amount` (DecimalField, max_digits=12, decimal_places=2) — *Maintained original_amount - paid_amount*
  - `status` (CharField, max_length=20, choices=[`UNPAID`, `PARTIAL`, `PAID`, `VOIDED`, `CLOSED`], default=`UNPAID`)
  - `due_date` (DateField, null=True, blank=True)
  - `notes` (TextField, blank=True)
  - `created_at` (DateTimeField, auto_now_add=True)
  - `updated_at` (DateTimeField, auto_now=True)
- **Database Constraints**:
  - `UniqueConstraint(fields=["business", "invoice_number"], name="unique_invoice_per_business")` — *Mencegah duplikasi invoice number dalam satu business*
- **Destructive Protection**:
  - **TIDAK ADA** endpoint DELETE untuk `Receivable`.
  - Pelindungan `PROTECT` memastikan record historis tidak terhapus secara destruktif.

### 3.2. `PaymentAllocation` (Alokasi Pembayaran Piutang)
Catatan penerimaan kas khusus untuk piutang (`PaymentAllocation` bukan `billing.Payment` yang dikhususkan untuk SaaS subscription).
- **PK**: `id` (UUIDField, primary_key=True, default=uuid.uuid4, editable=False)
- **Foreign Keys**:
  - `business` (FK → `Business`, on_delete=models.CASCADE, related_name="payment_allocations")
  - `receivable` (FK → `Receivable`, on_delete=models.PROTECT, related_name="allocations") — *PROTECT mencegah penghapusan receivable yang memiliki allocation*
  - `created_by` (FK → `settings.AUTH_USER_MODEL`, on_delete=models.SET_NULL, null=True)
  - `reversed_by` (FK → `settings.AUTH_USER_MODEL`, on_delete=models.SET_NULL, null=True, blank=True)
- **Fields**:
  - `amount` (DecimalField, max_digits=12, decimal_places=2) — *Harus > 0*
  - `payment_method` (CharField, max_length=20, choices=[`CASH`, `QRIS`, `TRANSFER`])
  - `payment_date` (DateTimeField, default=timezone.now)
  - `reference` (CharField, max_length=100, blank=True)
  - `notes` (TextField, blank=True)
  - `is_reversed` (BooleanField, default=False)
  - `reversed_at` (DateTimeField, null=True, blank=True)
  - `reversal_reason` (TextField, blank=True)
  - `created_at` (DateTimeField, auto_now_add=True)
- **Destructive Protection**:
  - **TIDAK ADA** endpoint DELETE atau PATCH untuk `PaymentAllocation`. Sifatnya *append-only* (immutable).

---

## 4. CROSS-ENTITY BUSINESS CONSISTENCY & DOMAIN INVARIANTS

Setiap entitas **WAJIB** memenuhi domain invariants berikut (divalidasi secara transaksional/server-side):
1. `Receivable.business == Sale.business`
2. `Receivable.business == Customer.business`
3. `Receivable.business == Location.business`
4. `Receivable.location == Sale.location`
5. `PaymentAllocation.business == PaymentAllocation.receivable.business`
6. `Receivable.invoice_number` **UNIK per business** (enforced via database constraint)

*Pelanggaran invariant ini menghasilkan penolakan server-side (HTTP 400 / HTTP 404). Cross-business request tetap menghasilkan HTTP 404 sesuai security contract.*

---

## 5. SOURCE OF TRUTH, SALDO & LIFECYCLE INVARIANTS

1. `original_amount` bersifat **IMMUTABLE** sejak diterbitkan.
2. Histori pembayaran valid (`is_reversed == False`) adalah **Source of Truth** pembayaran.
3. `paid_amount` dan `outstanding_amount` adalah maintained/denormalized values.
4. Formula Konsistensi:
   $$\text{paid\_amount} = \sum_{\text{allocations where is\_reversed=False}} \text{allocation.amount}$$
   $$\text{outstanding\_amount} = \text{original\_amount} - \text{paid\_amount}$$
   $$\text{outstanding\_amount} \ge 0$$
5. **Lifecycle Invariants**:
   - `UNPAID`: `paid_amount == 0`, `outstanding_amount == original_amount`
   - `PARTIAL`: `0 < paid_amount < original_amount`, `outstanding_amount > 0`
   - `PAID`: `paid_amount == original_amount`, `outstanding_amount == 0`
   - `VOIDED`: `outstanding_amount == 0`, kewajiban batal total karena Sale di-void
   - `CLOSED`: `outstanding_amount == 0`, *administrative write-off* oleh Owner (bukan `PAID`).
   - Status dilarang diedit manual via HTTP PATCH.

---

## 6. ADMINISTRATIVE CLOSURE (`CLOSED`) SEMANTICS

- Status `CLOSED` merupakan penutupan administratif / penghapusbukuan (*bad debt write-off*) manual oleh Owner via `POST .../receivables/{id}/close/`.
- **Semantik Saldo Saat CLOSED**:
  - `original_amount`: Tetap utuh (misal: Rp100.000).
  - Historical `paid_amount`: Tetap mencatat pembayaran valid yang pernah masuk (misal: Rp40.000).
  - `outstanding_amount`: Diset menjadi **Rp0**.
  - Status: `CLOSED`.
- **Aturan CLOSED**:
  - `CLOSED != PAID`. Selisih write-off tetap dapat diketahui dari original vs historical paid.
  - `CLOSED` tidak dihitung sebagai *active outstanding*.
  - `CLOSED` **TIDAK MEMBUAT** otomatisasi jurnal akuntansi (`Journal`/`JournalEntry`/`Ledger`).
  - Hanya role `Owner` yang dapat melakukan `CLOSED`.
  - **CLOSED + Payment Reversal**: `PaymentAllocation` pada Receivable berstatus `CLOSED` **TIDAK BOLEH DI-REVERSE** (mengembalikan HTTP 400). Tidak ada auto-reopen atau endpoint `REOPEN`.
  - **CLOSED + Payment Recording**: Receivable berstatus `CLOSED` **TIDAK BOLEH MENERIMA PEMBAYARAN BARU** (mengembalikan HTTP 400).

---

## 7. BUSINESS TIMEZONE HANDLING (MVP SCOPE)

- `OVERDUE` dan kalkulasi Aging **WAJIB** menggunakan tanggal kalender berdasarkan **Timezone Server** (`timezone.localdate()`) pada MVP GAP-02.
- **Implementation Checkpoint**: Model `Business` (per repository inspection `apps/business/models.py`) **BELUM memiliki field `timezone`**. Untuk MVP GAP-02, implementation WAJIB menggunakan `timezone.localdate()` sebagai `business_today`. 
- **Business-Specific Timezone** adalah **FUTURE ENHANCEMENT** yang memerlukan Contract Amendment terpisah untuk menambahkan field `timezone` pada model `Business`.
- Derived overdue logic (MVP):
  ```python
  business_today = timezone.localdate()  # Server timezone for MVP
  is_overdue = bool(
      receivable.due_date
      and receivable.due_date < business_today
      and receivable.outstanding_amount > 0
      and receivable.status in ["UNPAID", "PARTIAL"]
  )
  ```
- Aging calculation menggunakan `business_today` (MVP server timezone).

---

## 8. CREDIT SALE ATOMICITY & CREATION SEMANTICS

- `Receivable` HANYA diterbitkan sebagai konsekuensi dari transaksi `Sale` berstatus `COMPLETED` yang memenuhi kriteria kredit.
- **Credit Sale Atomic Transaction Block**:
  ```text
  with transaction.atomic():
      1. Create Sale (status=COMPLETED) via existing flow
      2. Execute existing Inventory stock reduction (select_for_update)
      3. Validate cross-entity business consistency
      4. Create Receivable (original_amount=Sale Total, unique invoice_number)
      5. If initial DP > 0:
           Create PaymentAllocation(amount=DP)
           Update Receivable paid_amount, outstanding_amount, status=PARTIAL
         Else:
           Receivable status=UNPAID
  ```
- Jika ada satu langkah gagal, seluruh blok transaksi di-rollback secara sempurna (atomik).

---

## 9. PAYMENT RECORDING RULES & TERMINAL STATUS GUARD

- **Endpoint**: `POST /api/v1/businesses/{bid}/receivables/{receivable_id}/pay/`
- **Terminal Status Guard (CRITICAL)**:
  - Payment recording **WAJIB DITOLAK (HTTP 400)** jika `Receivable.status IN ['PAID', 'CLOSED', 'VOIDED']`.
  - Hanya Receivable berstatus `UNPAID` atau `PARTIAL` yang dapat menerima pembayaran baru.
- **Validation Rules**:
  - `amount > 0` (zero/negative payment ditolak).
  - `amount <= receivable.outstanding_amount` (overpayment ditolak).
  - Wajib dibungkus `transaction.atomic()` dan `select_for_update()` pada `Receivable`.
- **State Transitions via Payment**:
  - `UNPAID` + partial payment → `PARTIAL`
  - `UNPAID` + full payment → `PAID`
  - `PARTIAL` + payment (not full) → `PARTIAL`
  - `PARTIAL` + full payment → `PAID`
  - `PAID` + payment attempt → **HTTP 400**
  - `CLOSED` + payment attempt → **HTTP 400**
  - `VOIDED` + payment attempt → **HTTP 400**

---

## 10. PAYMENT REVERSAL TARGET & RULES

- Reversal menunjuk ID `PaymentAllocation` spesifik melalui endpoint:
  `POST /api/v1/businesses/{bid}/receivables/{receivable_id}/payments/{payment_id}/reverse/`
- **Aturan Reversal**:
  - Hanya dapat dieksekusi oleh role `OWNER`.
  - Wajib menyertakan `reversal_reason`.
  - Jika `PaymentAllocation.is_reversed == True` → **REJECT (HTTP 400)**.
  - Receivable dengan status `CLOSED` menolak reversal (HTTP 400).
  - Eksekusi wajib dibungkus `transaction.atomic()` dan `select_for_update()` pada `Receivable`. Menandai `is_reversed=True` dan menghitung ulang saldo serta status secara atomik.

---

## 11. CONCURRENCY & ROW-LEVEL LOCKING CONTRACT

Semua mutasi (`pay`, `reverse`, `close`, `void`) wajib mengunci record `Receivable` di database:
```python
with transaction.atomic():
    receivable = Receivable.objects.select_for_update().get(id=receivable_id, business=business)
    if payment_amount > receivable.outstanding_amount:
        raise ValidationError({"amount": "Payment exceeds current outstanding balance."})
```
*Mencegah overpayment dan double reversal pada request simultan.*

---

## 12. VOID & CANCELLATION RULES

1. **Void Transaksi (`Sale VOIDED`)**:
   - `UNPAID` Credit Sale: Diizinkan di-void oleh Owner → `Sale.status=VOIDED`, `Receivable.status=VOIDED`, `outstanding_amount=0`.
   - `PARTIAL` / `PAID` Credit Sale: **DITOLAK (HTTP 400)**. Seluruh pembayaran harus direverse terlebih dahulu oleh Owner sebelum transaksi penjualan dapat di-void.
   - `CLOSED` Receivable: Tidak dapat di-void melalui alur GAP-02.

---

## 13. PERMISSION MATRIX

| Endpoint / Action | Owner | Admin | Kasir |
| --- | --- | --- | --- |
| `GET /receivables/` (List) | YES | YES | YES (Hanya Lokasi Aktif) |
| `GET /receivables/{id}/` (Detail + Allocations) | YES | YES | YES (Hanya Lokasi Aktif) |
| Process Credit Sale | YES | YES | YES |
| `POST /receivables/{id}/pay/` (Record Payment) | YES | YES | YES (Hanya Lokasi Aktif) |
| `PATCH /receivables/{id}/` (Update `due_date`, `notes`) | YES | YES | NO (HTTP 403) |
| `POST /receivables/{id}/payments/{pid}/reverse/` | YES | NO (HTTP 403) | NO (HTTP 403) |
| `POST /receivables/{id}/close/` | YES | NO (HTTP 403) | NO (HTTP 403) |
| `GET /reports/piutang/` | YES | YES | NO (HTTP 403) |

---

## 14. API ENDPOINT BOUNDARY & RESTRICTIONS

| Method | Endpoint | Allowed Body / Params | Role |
| --- | --- | --- | --- |
| GET | `/api/v1/businesses/{bid}/receivables/` | `status`, `customer`, `overdue`, `date_from`, `date_to`, `location` | Owner, Admin, Kasir |
| GET | `/api/v1/businesses/{bid}/receivables/{id}/` | - | Owner, Admin, Kasir |
| PATCH | `/api/v1/businesses/{bid}/receivables/{id}/` | Writable: `due_date`, `notes` ONLY | Owner, Admin |
| POST | `/api/v1/businesses/{bid}/receivables/{id}/pay/` | `amount`, `payment_method`, `reference`, `notes` | Owner, Admin, Kasir |
| POST | `/api/v1/businesses/{bid}/receivables/{id}/payments/{pid}/reverse/` | `reversal_reason` | Owner Only |
| POST | `/api/v1/businesses/{bid}/receivables/{id}/close/` | `notes` | Owner Only |
| GET | `/api/v1/businesses/{bid}/reports/piutang/` | `date_from`, `date_to`, `location` | Owner, Admin |

**Larangan Keras:**
- `Receivable` tidak memiliki endpoint DELETE.
- `PaymentAllocation` tidak memiliki endpoint PUT, PATCH, atau DELETE.
- PATCH `Receivable` dilarang mengubah: `business`, `location`, `customer`, `sale`, `invoice_number`, `original_amount`, `paid_amount`, `outstanding_amount`, `status`.

---

## 15. AUDIT TRAIL LOGGING

Event wajib dicatat pada Audit Engine:
1. `RECEIVABLE_CREATED`
2. `PAYMENT_ALLOCATED`
3. `PAYMENT_REVERSED`
4. `DUE_DATE_UPDATED`
5. `RECEIVABLE_VOIDED`
6. `RECEIVABLE_CLOSED`

---

## 16. ACCEPTANCE CRITERIA & TEST SUITE MANDATORY

GAP-02 dianggap **GREEN & COMPLETE** hanya jika seluruh skenario berikut lulus pengujian:
1. **Credit Sale & Atomicity**:
   - Credit sale Rp100k + DP Rp0 → Receivable UNPAID, outstanding=100k.
   - Credit sale Rp100k + DP Rp40k → Receivable PARTIAL, outstanding=60k, 1 PaymentAllocation (40k).
   - Atomicity: Simulasi DB failure pada saat pembuatan `Receivable` atau alokasi DP wajib me-rollback transaksi Sale dan pemotongan stok inventory.
   - Cross-entity business consistency: Percobaan mismatched business (Receivable business A dengan Sale business B, Customer business B, Location business B, atau PaymentAllocation business B) ditolak server-side (HTTP 400 / 404).
2. **Invoice Number Uniqueness**:
   - Duplicate `invoice_number` dalam business yang sama → ditolak (HTTP 400 / IntegrityError).
   - Same `invoice_number` pada business berbeda → diizinkan.
3. **Payment Allocation & Terminal Status Guard**:
   - Pembayaran parsial berulang dan pelunasan penuh memperbarui saldo & status secara presisi.
   - Pembayaran baru pada Receivable berstatus `PAID` → ditolak (HTTP 400).
   - Pembayaran baru pada Receivable berstatus `CLOSED` → ditolak (HTTP 400).
   - Pembayaran baru pada Receivable berstatus `VOIDED` → ditolak (HTTP 400).
   - Reversal mengembalikan nominal ke outstanding dan memperbarui status secara atomik.
   - Reversal pada payment yang sudah reversed → Ditolak (HTTP 400).
   - Double reversal ditolak.
4. **Closed (Write-off) Semantics**:
   - Partial (Original=100k, Paid=40k, Outstanding=60k) yang di-CLOSE menghasilkan `original_amount=100k`, historical `paid_amount=40k`, `outstanding_amount=0`, dan status `CLOSED`.
   - `CLOSED != PAID`. Tidak masuk hitungan active outstanding.
   - Reversal pembayaran pada Receivable berstatus `CLOSED` → Ditolak (HTTP 400).
   - Closed tidak dapat di-reopen.
5. **Concurrency & Locking**:
   - Dua request payment simultan pada piutang saldo 100k (masing-masing 70k) menghasilkan 1 sukses (sisa 30k) dan 1 gagal (HTTP 400).
6. **Business Timezone (MVP)**:
   - Overdue boundary diuji menggunakan `timezone.localdate()` (server timezone).
7. **Regression Baseline**:
   - Seluruh test suite modul lain tetap GREEN.
   - Pre-existing membership test failure (`test_8_owner_existing_behavior_remains_intact`) tetap dipertahankan tanpa dimanipulasi.

---

## 17. EXPLICIT OUT-OF-SCOPE & FUTURE BOUNDARY

**OUT OF SCOPE (GAP-02 MVP):**
- Accounts Payable / Utang Usaha ke Supplier (GAP-03 Hutang).
- Automasi jurnal akuntansi ganda (*Automatic Double-Entry Journal Posting*).
- Penegakan batas kredit pelanggan (*Customer Credit Limit Enforcement*).
- Perhitungan bunga / denda keterlambatan (*Late Penalty / Interest Calculation*).
- Pengiriman pengingat otomatis via WhatsApp / Email (*Automated Reminder*).
- Payment Gateway online untuk pelunasan mandiri oleh customer (*Online Payment Gateway Integration*).
- Engine refund penjualan terpisah (*Refund Engine*).
- Otomatisasi akuntansi write-off / bad debt journal (*Write-off Accounting Automation*).
- Endpoint `REOPEN` untuk membuka kembali Receivable berstatus `CLOSED`.
- Business-specific timezone field pada model `Business` (FUTURE ENHANCEMENT).

---

## 18. FINAL GATE DECISION

```text
GAP-02 PIUTANG — CONTRACT LOCK READY FOR HUMAN APPROVAL
```

> **CONTRACT LOCK READY — STOP. Awaiting human approval before RED / implementation.**
