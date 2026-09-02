# GAP-03 HUTANG — CONTRACT LOCK

**Status:** 🔒 CONTRACT LOCKED (Ready for Human Approval)
**Module Domain:** `apps/payable/` & `frontend/src/payable/`
**Parent Contracts:** GAP-02 PIUTANG Contract Lock, KOPERA_OS_MASTER.md, MASTER_STRUKTUR_KOPERA_OS.md, STRUKTUR_OWNER.md
**Date:** 2026-09-02

---

## 1. CONTRACT OBJECTIVE

GAP-03 menyediakan kemampuan KOPERA OS untuk:
- Mencatat kewajiban pembayaran ke Supplier (*payable / buy now, pay later*).
- Menerbitkan Utang (`Payable`) terisolasi per-bisnis dan per-lokasi yang terikat 1-to-1 dengan `PurchaseOrder` berstatus `CONFIRMED`.
- Menerima pembayaran parsial/bertahap (`SupplierPaymentAllocation`) secara *atomic*, *row-locked*, dan *immutable*.
- Menghitung sisa saldo hutang (*outstanding balance*) dan saldo hutang per supplier (*supplier balance*) secara konsisten.
- Mengelola siklus hidup utang (`UNPAID`, `PARTIAL`, `PAID`, `VOIDED`, `CLOSED`).
- Mengelola pembatalan (*reversal*) pembayaran individual secara spesifik dan *audit-safe*.
- Menyediakan *visibility* hutang bagi Owner dan Admin sesuai matriks izin dan batas akses lokasi tanpa merusak modul yang telah terkunci.

---

## 2. EXISTING FOUNDATION & PURCHASING + INVENTORY BOUNDARY

Modul-modul berikut bersifat 🔒 **LOCKED**:
- `Supplier` (`apps/supplier/models.py`)
- `PurchaseOrder` & `PurchaseOrderLine` (`apps/purchasing/models.py`)
- `Inventory`: Mekanisme pemotongan stok di luar scope GAP-03
- `BusinessAccessMixin` & Security Engine: Isolasi tenant `business_id`
- Location Context & Scoping (`location_id`)
- System Roles: `OWNER`, `ADMIN`, `KASIR`
- Finance Foundation (`Account`, `Journal`, `JournalEntry`, `Ledger`, `Expense`)

**PurchaseOrder Lifecycle (ACTUAL REPOSITORY STATE):**
- Status choices: `DRAFT`, `CONFIRMED`, `CANCELLED`
- **TIDAK ADA** status `RECEIVED` atau `COMPLETED`
- **TIDAK ADA** endpoint receiving / goods receipt
- **TIDAK ADA** stock/inventory mutation dari PurchaseOrder CRUD
- **TIDAK ADA** `total_amount` field (harus dihitung dari lines: Σ quantity × unit_price)
- PurchaseOrder **DAPAT DIHAPUS** (DELETE diizinkan, tidak seperti Sale → Receivable yang PROTECT)

**Purchasing + Inventory Integration Boundary:**
- GAP-03 **TIDAK MEMBUAT ULANG** Purchasing completion engine atau Inventory receiving engine.
- Payable dibuat melalui operasi **standalone credit payable** yang mereferensikan PurchaseOrder yang sudah `CONFIRMED`.
- Dilarang membuat: duplicate stock deduction, duplicate receiving logic, perubahan pada `PurchaseOrder.Status` choices existing, perubahan pada `Supplier` model, atau bypass authorization.

---

## 3. NEW DOMAIN ARCHITECTURE & DATA RETENTION / PROTECTION

GAP-03 menambahkan dua model pada `apps/payable/models.py`:

### 3.1. `Payable` (Utang)
- **PK**: `id` (UUIDField, primary_key=True, default=uuid.uuid4, editable=False)
- **Foreign Keys**:
  - `business` (FK → `Business`, on_delete=models.CASCADE, related_name="payables")
  - `location` (FK → `Location`, on_delete=models.PROTECT, related_name="payables") — *PROTECT mencegah kehilangan data historis finansial akibat penghapusan lokasi*
  - `supplier` (FK → `Supplier`, on_delete=models.PROTECT, related_name="payables") — *PROTECT mencegah penghapusan supplier yang memiliki jejak utang*
  - `purchase_order` (OneToOneField → `PurchaseOrder`, on_delete=models.PROTECT, related_name="payable") — *1-to-1 dengan PurchaseOrder*
- **Fields**:
  - `invoice_number` (CharField, max_length=100) — **WAJIB UNIK per business**
  - `original_amount` (DecimalField, max_digits=12, decimal_places=2, editable=False) — *Immutable, dihitung dari PO lines saat pembuatan*
  - `paid_amount` (DecimalField, max_digits=12, decimal_places=2, default=0) — *Maintained/denormalized sum of active allocations*
  - `outstanding_amount` (DecimalField, max_digits=12, decimal_places=2) — *Maintained original_amount - paid_amount*
  - `status` (CharField, max_length=20, choices=[`UNPAID`, `PARTIAL`, `PAID`, `VOIDED`, `CLOSED`], default=`UNPAID`)
  - `due_date` (DateField, null=True, blank=True)
  - `notes` (TextField, blank=True)
  - `created_at` (DateTimeField, auto_now_add=True)
  - `updated_at` (DateTimeField, auto_now=True)
- **Database Constraints**:
  - `UniqueConstraint(fields=["business", "invoice_number"], name="unique_payable_invoice_per_business")` — *Mencegah duplikasi invoice number dalam satu business*
- **Destructive Protection**:
  - **TIDAK ADA** endpoint DELETE untuk `Payable`.
  - Pelindungan `PROTECT` memastikan record historis tidak terhapus secara destruktif.

### 3.2. `SupplierPaymentAllocation` (Alokasi Pembayaran Utang)
Catatan penerimaan kas khusus untuk utang supplier.
- **PK**: `id` (UUIDField, primary_key=True, default=uuid.uuid4, editable=False)
- **Foreign Keys**:
  - `business` (FK → `Business`, on_delete=models.CASCADE, related_name="supplier_payment_allocations")
  - `payable` (FK → `Payable`, on_delete=models.PROTECT, related_name="allocations") — *PROTECT mencegah penghapusan payable yang memiliki allocation*
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
  - **TIDAK ADA** endpoint DELETE atau PATCH untuk `SupplierPaymentAllocation`. Sifatnya *append-only* (immutable).

---

## 4. CROSS-ENTITY BUSINESS CONSISTENCY & DOMAIN INVARIANTS

Setiap entitas **WAJIB** memenuhi domain invariants berikut (divalidasi secara transaksional/server-side):
1. `Payable.business == PurchaseOrder.business`
2. `Payable.business == Supplier.business`
3. `Payable.business == Location.business`
4. `Payable.location == PurchaseOrder.location`
5. `SupplierPaymentAllocation.business == SupplierPaymentAllocation.payable.business`
6. `Payable.invoice_number` **UNIK per business** (enforced via database constraint)

*Pelanggaran invariant ini menghasilkan penolakan server-side (HTTP 400 / HTTP 404). Cross-business request tetap menghasilkan HTTP 404 sesuai security contract.*

---

## 5. SOURCE OF TRUTH, SALDO & LIFECYCLE INVARIANTS

1. `original_amount` bersifat **IMMUTABLE** sejak diterbitkan. Dihitung dari `Σ PurchaseOrderLine.quantity × PurchaseOrderLine.unit_price` saat Payable dibuat.
2. Histori pembayaran valid (`is_reversed == False`) adalah **Source of Truth** pembayaran.
3. `paid_amount` dan `outstanding_amount` adalah maintained/denormalized values.
4. Formula Konsistensi:
   - `paid_amount = Σ allocations where is_reversed=False → allocation.amount`
   - `outstanding_amount = original_amount - paid_amount`
   - `outstanding_amount >= 0`
5. **Lifecycle Invariants**:
   - `UNPAID`: `paid_amount == 0`, `outstanding_amount == original_amount`
   - `PARTIAL`: `0 < paid_amount < original_amount`, `outstanding_amount > 0`
   - `PAID`: `paid_amount == original_amount`, `outstanding_amount == 0`
   - `VOIDED`: `outstanding_amount == 0`, kewajiban batal total karena PurchaseOrder di-cancel
   - `CLOSED`: `outstanding_amount == 0`, *administrative write-off* oleh Owner (bukan `PAID`).
   - Status dilarang diedit manual via HTTP PATCH.

---

## 6. PAYABLE CREATION SEMANTICS

### 6.1. Origin: Standalone Credit Payable

**CRITICAL DEVIATION FROM GAP-02:**

Karena PurchaseOrder **tidak memiliki status `RECEIVED` atau `COMPLETED`** dan **tidak ada receiving endpoint**, Payable TIDAK dibuat secara atomic dengan PurchaseOrder.

Payable dibuat melalui operasi **standalone credit payable**:
1. Owner atau Admin memilih PurchaseOrder berstatus `CONFIRMED`.
2. Owner atau Admin memilih lokasi asal.
3. Owner atau Admin memilih supplier (diambil otomatis dari PO).
4. Server menghitung `original_amount = Σ PurchaseOrderLine.quantity × unit_price`.
5. Payable dibuat dengan status `UNPAID` atau `PARTIAL` (jika ada DP).

### 6.2. Atomic Transaction Block

```text
with transaction.atomic():
    1. Validate PurchaseOrder exists and status == CONFIRMED
    2. Validate Payable.invoice_number unique per business
    3. Compute original_amount from PO lines
    4. Validate cross-entity business consistency
    5. Create Payable (status=UNPAID)
    6. If initial_payment > 0:
         Create SupplierPaymentAllocation(amount=DP)
         Update Payable paid_amount, outstanding_amount, status=PARTIAL
       Else:
         Payable status=UNPAID
```

Jika ada satu langkah gagal, seluruh blok transaksi di-rollback secara sempurna (atomik).

### 6.3. PurchaseOrder Status Eligibility

Payable **HANYA DAPAT** dibuat untuk PurchaseOrder dengan status `CONFIRMED`.

- `DRAFT`: Belum dikonfirmasi, tidak bisa membuat utang.
- `CANCELLED`: Dibatalkan, tidak bisa membuat utang.

---

## 7. PAYMENT RECORDING RULES & TERMINAL STATUS GUARD

- **Endpoint**: `POST /api/v1/businesses/{bid}/payables/{payable_id}/pay/`
- **Terminal Status Guard (CRITICAL)**:
  - Payment recording **WAJIB DITOLAK (HTTP 400)** jika `Payable.status IN ['PAID', 'CLOSED', 'VOIDED']`.
  - Hanya Payable berstatus `UNPAID` atau `PARTIAL` yang dapat menerima pembayaran baru.
- **Validation Rules**:
  - `amount > 0` (zero/negative payment ditolak).
  - `amount <= payable.outstanding_amount` (overpayment ditolak).
  - Wajib dibungkus `transaction.atomic()` dan `select_for_update()` pada `Payable`.
- **State Transitions via Payment**:
  - `UNPAID` + partial payment → `PARTIAL`
  - `UNPAID` + full payment → `PAID`
  - `PARTIAL` + payment (not full) → `PARTIAL`
  - `PARTIAL` + full payment → `PAID`
  - `PAID` + payment attempt → **HTTP 400**
  - `CLOSED` + payment attempt → **HTTP 400**
  - `VOIDED` + payment attempt → **HTTP 400**

---

## 8. PAYMENT REVERSAL TARGET & RULES

- Reversal menunjuk ID `SupplierPaymentAllocation` spesifik melalui endpoint:
  `POST /api/v1/businesses/{bid}/payables/{payable_id}/payments/{payment_id}/reverse/`
- **Aturan Reversal**:
  - Hanya dapat dieksekusi oleh role `OWNER`.
  - Wajib menyertakan `reversal_reason`.
  - Jika `SupplierPaymentAllocation.is_reversed == True` → **REJECT (HTTP 400)**.
  - Payable dengan status `CLOSED` menolak reversal (HTTP 400).
  - Eksekusi wajib dibungkus `transaction.atomic()` dan `select_for_update()` pada `Payable`. Menandai `is_reversed=True` dan menghitung ulang saldo serta status secara atomik.

---

## 9. CONCURRENCY & ROW-LEVEL LOCKING CONTRACT

Semua mutasi (`pay`, `reverse`, `close`) wajib mengunci record `Payable` di database:
```python
with transaction.atomic():
    payable = Payable.objects.select_for_update().get(id=payable_id, business=business)
    if payment_amount > payable.outstanding_amount:
        raise ValidationError({"amount": "Payment exceeds current outstanding balance."})
```
*Mencegah overpayment dan double reversal pada request simultan.*

---

## 10. VOID / CANCEL SEMANTICS

1. **Cancel PurchaseOrder (`PO CANCELLED`)**:
   - `UNPAID` Payable: Diizinkan di-void oleh Owner → `Payable.status=VOIDED`, `outstanding_amount=0`.
   - `PARTIAL` / `PAID` Payable: **DITOLAK (HTTP 400)**. Seluruh pembayaran harus direverse terlebih dahulu oleh Owner sebelum PurchaseOrder dapat di-cancel.
   - `CLOSED` Payable: Tidak dapat di-void melalui alur GAP-03.
   - **BLOCKED**: Modify `PurchaseOrder.status` atau `PurchaseOrder` lifecycle. Payable void hanya dipicu dari sisi Payable, bukan dari modul Purchasing.

---

## 11. ADMINISTRATIVE CLOSURE (`CLOSED`) SEMANTICS

- Status `CLOSED` merupakan penutupan administratif / penghapusbukuan (*bad debt write-off*) manual oleh Owner via `POST .../payables/{id}/close/`.
- **Semantik Saldo Saat CLOSED**:
  - `original_amount`: Tetap utuh.
  - Historical `paid_amount`: Tetap mencatat pembayaran valid yang pernah masuk.
  - `outstanding_amount`: Diset menjadi **Rp0**.
  - Status: `CLOSED`.
- **Aturan CLOSED**:
  - `CLOSED != PAID`. Selisih write-off tetap dapat diketahui dari original vs historical paid.
  - `CLOSED` tidak dihitung sebagai *active outstanding*.
  - `CLOSED` **TIDAK MEMBUAT** otomatisasi jurnal akuntansi.
  - Hanya role `Owner` yang dapat melakukan `CLOSED`.
  - **CLOSED + Payment Reversal**: `SupplierPaymentAllocation` pada Payable berstatus `CLOSED` **TIDAK BOLEH DI-REVERSE** (HTTP 400).
  - **CLOSED + Payment Recording**: Payable berstatus `CLOSED` **TIDAK BOLEH MENERIMA PEMBAYARAN BARU** (HTTP 400).
  - Tidak ada endpoint `REOPEN`.

---

## 12. BUSINESS TIMEZONE HANDLING (MVP SCOPE)

- `OVERDUE` dan kalkulasi Aging **WAJIB** menggunakan tanggal kalender berdasarkan **Timezone Server** (`timezone.localdate()`) pada MVP GAP-03.
- Derived overdue logic:
  ```python
  business_today = timezone.localdate()
  is_overdue = bool(
      payable.due_date
      and payable.due_date < business_today
      and payable.outstanding_amount > 0
      and payable.status in ["UNPAID", "PARTIAL"]
  )
  ```
- Aging calculation menggunakan `business_today`.

---

## 13. PERMISSION MATRIX

| Endpoint / Action | Owner | Admin | Kasir |
| --- | --- | --- | --- |
| `GET /payables/` (List) | YES | YES | NO |
| `GET /payables/{id}/` (Detail + Allocations) | YES | YES | NO |
| Create Payable | YES | YES | NO |
| `POST /payables/{id}/pay/` (Record Payment) | YES | YES | NO |
| `PATCH /payables/{id}/` (Update `due_date`, `notes`) | YES | YES | NO |
| `POST /payables/{id}/payments/{pid}/reverse/` | YES | NO (HTTP 403) | NO (HTTP 403) |
| `POST /payables/{id}/close/` | YES | NO (HTTP 403) | NO (HTTP 403) |
| `GET /payables/reports/` | YES | YES | NO (HTTP 403) |

**CATATAN KRITIS vs GAP-02:**
- KASIR **TIDAK** memiliki akses ke modul Utang / Payable karena KASIR tidak memiliki akses ke Purchasing dan Supplier (terlihat dari permission matrix aktual: `("KASIR", "purchasing", "view"): False`, `("KASIR", "supplier", "view"): False`).
- Ini berbeda dari GAP-02 di mana KASIR memiliki akses ke Receivables.

---

## 14. API ENDPOINT BOUNDARY & RESTRICTIONS

| Method | Endpoint | Allowed Body / Params | Role |
| --- | --- | --- | --- |
| GET | `/api/v1/businesses/{bid}/payables/` | `status`, `supplier`, `overdue`, `date_from`, `date_to`, `location` | Owner, Admin |
| GET | `/api/v1/businesses/{bid}/payables/{id}/` | - | Owner, Admin |
| POST | `/api/v1/businesses/{bid}/payables/` | `purchase_order`, `location`, `initial_payment`, `payment_method`, `due_date`, `notes`, `invoice_number` | Owner, Admin |
| PATCH | `/api/v1/businesses/{bid}/payables/{id}/` | Writable: `due_date`, `notes` ONLY | Owner, Admin |
| POST | `/api/v1/businesses/{bid}/payables/{id}/pay/` | `amount`, `payment_method`, `reference`, `notes` | Owner, Admin |
| POST | `/api/v1/businesses/{bid}/payables/{id}/payments/{pid}/reverse/` | `reversal_reason` | Owner Only |
| POST | `/api/v1/businesses/{bid}/payables/{id}/close/` | `notes` | Owner Only |
| GET | `/api/v1/businesses/{bid}/payables/reports/` | `date_from`, `date_to`, `location` | Owner, Admin |

**Larangan Keras:**
- `Payable` tidak memiliki endpoint DELETE.
- `SupplierPaymentAllocation` tidak memiliki endpoint PUT, PATCH, atau DELETE.
- PATCH `Payable` dilarang mengubah: `business`, `location`, `supplier`, `purchase_order`, `invoice_number`, `original_amount`, `paid_amount`, `outstanding_amount`, `status`.

---

## 15. AUDIT TRAIL LOGGING

Event wajib dicatat pada Audit Engine:
1. `PAYABLE_CREATED`
2. `SUPPLIER_PAYMENT_ALLOCATED`
3. `SUPPLIER_PAYMENT_REVERSED`
4. `DUE_DATE_UPDATED`
5. `PAYABLE_CLOSED`
6. `PAYABLE_VOIDED`

---

## 16. AGING CONTRACT

- **Buckets:** `Not Due`, `1–15 Days`, `16–30 Days`, `31–60 Days`, `Over 60 Days`.
- **Exclusions:** `PAID`, `CLOSED`, and `VOIDED` payables are strictly excluded from aging totals.
- **Database Status Invariant:** `OVERDUE` is strictly a derived presentation state, NEVER a database status.

---

## 17. REPORT CONTRACT

Reports endpoint: `GET /api/v1/businesses/{bid}/payables/reports/`

**Response Shape:**
```json
{
  "total_outstanding": "5000000.00",
  "total_overdue": "2000000.00",
  "count_suppliers_with_debt": 3,
  "aging_summary": {
    "not_due": "2000000.00",
    "days_1_15": "1000000.00",
    "days_16_30": "500000.00",
    "days_31_60": "500000.00",
    "over_60_days": "1000000.00"
  },
  "payables_by_supplier": [
    {"supplier_id": "...", "supplier_name": "...", "outstanding": "1500000.00", "open_payables_count": 2}
  ]
}
```

---

## 18. FRONTEND CONTRACT

### 18.1. Types (`frontend/src/payable/types.ts`)

```typescript
export type PayableStatus = "UNPAID" | "PARTIAL" | "PAID" | "VOIDED" | "CLOSED";
export type PaymentMethodChoice = "CASH" | "QRIS" | "TRANSFER";

export interface SupplierPaymentAllocation {
  id: string;
  business: string;
  payable: string;
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

export interface Payable {
  id: string;
  business: string;
  location: string;
  supplier: string;
  purchase_order: string;
  invoice_number: string;
  original_amount: string;
  paid_amount: string;
  outstanding_amount: string;
  status: PayableStatus;
  due_date: string | null;
  is_overdue: boolean;
  notes: string;
  allocations: SupplierPaymentAllocation[];
  created_at: string;
  updated_at: string;
}

export interface PayableCreatePayload {
  purchase_order: string;
  location: string;
  initial_payment?: string;
  payment_method?: PaymentMethodChoice;
  due_date?: string | null;
  notes?: string;
  invoice_number?: string;
}

export interface PayableUpdatePayload {
  due_date?: string | null;
  notes?: string;
}

export interface SupplierPaymentCreatePayload {
  amount: string;
  payment_method: PaymentMethodChoice;
  reference?: string;
  notes?: string;
}

export interface SupplierPaymentReversePayload {
  reversal_reason: string;
}

export interface PayableClosePayload {
  notes?: string;
}

export interface PayableAgingSummary {
  not_due: string;
  days_1_15: string;
  days_16_30: string;
  days_31_60: string;
  over_60_days: string;
}

export interface SupplierDebtSummary {
  supplier_id: string;
  supplier_name: string;
  outstanding: string;
  open_payables_count: number;
}

export interface PayableReportResponse {
  total_outstanding: string;
  total_overdue: string;
  count_suppliers_with_debt: number;
  aging_summary: PayableAgingSummary;
  payables_by_supplier: SupplierDebtSummary[];
}
```

### 18.2. Service (`frontend/src/payable/payableService.ts`)

8 service functions mirroring `receivableService.ts`:
1. `listPayables(businessId, params?)` → `GET /payables/`
2. `createPayable(businessId, payload)` → `POST /payables/`
3. `getPayable(businessId, payableId, locationId?)` → `GET /payables/{id}/`
4. `updatePayable(businessId, payableId, payload)` → `PATCH /payables/{id}/`
5. `payPayable(businessId, payableId, payload)` → `POST /payables/{id}/pay/`
6. `reverseSupplierPayment(businessId, payableId, paymentId, payload)` → `POST /payables/{id}/payments/{pid}/reverse/`
7. `closePayable(businessId, payableId, payload)` → `POST /payables/{id}/close/`
8. `getPayableReports(businessId)` → `GET /payables/reports/`

### 18.3. Pages

| Page | Route | Component |
|---|---|---|
| Payable List | `/payables` | `PayableList.tsx` |
| Payable Create | `/payables/new` | `PayableCreate.tsx` |
| Payable Detail | `/payables/:payableId` | `PayableDetail.tsx` |
| Payable Reports | `/payables/reports` | `UtangReports.tsx` |

### 18.4. Route Contract

Registered inside `<BusinessProvider>` in `frontend/src/routes/router.tsx`:
- `/payables` → `<PayableList />` wrapped in `<ProtectedRoute>`, `<BusinessRoute>`, `<AppLayout>`
- `/payables/new` → `<PayableCreate />` wrapped in `<ProtectedRoute>`, `<BusinessRoute>`, `<AppLayout>`
- `/payables/reports` → `<UtangReports />` wrapped in `<ProtectedRoute>`, `<BusinessRoute>`, `<AppLayout>`
- `/payables/:payableId` → `<PayableDetail />` wrapped in `<ProtectedRoute>`, `<BusinessRoute>`, `<AppLayout>`

### 18.5. Navigation Contract

- **Sidebar Label:** "Hutang"
- **Route Target:** `/payables`
- **Visibility:** Rendered for OWNER and ADMIN only.
- **Active State:** Highlighted when current pathname starts with `/payables`.

---

## 19. UI/UX CONTRACT

### 19.1. Payable List (`PayableList.tsx`)

- **Page Header:** "Hutang" + "Buat Utang" CTA button (`/payables/new`).
- **KPI Header Cards:**
  - Total Outstanding (`data-testid="kpi-total-outstanding"`)
  - Total Overdue (`data-testid="kpi-total-overdue"`)
  - Suppliers with Debt (`data-testid="kpi-suppliers-with-debt"`)
- **Filter Bar:** Status selector, Supplier selector, Location selector, Overdue checkbox, Date From/To picker.
- **Table Columns:** Invoice #, Supplier, Location, Original, Paid, Outstanding, Due Date, Status Badge, Overdue Indicator, Actions ("Lihat").
- **States:** Loading state, Error state, Empty state.

### 19.2. Payable Create (`PayableCreate.tsx`)

- **Form Fields:**
  - PurchaseOrder selector (only CONFIRMED POs available).
  - Location selector (defaults to `currentLocationId`).
  - Supplier (auto-populated from PO, read-only).
  - Original Amount (auto-computed from PO lines, read-only).
  - Optional initial DP payment & Payment Method.
  - Optional Due Date & Notes.
  - Optional Invoice Number.
- **Overpayment Feedback:** DP > total → amber warning.
- **Submit Action:** Calls `createPayable()`. On success, redirects to `/payables/:id`.

### 19.3. Payable Detail (`PayableDetail.tsx`)

- **Header:** Invoice number, Supplier name, Status badge, Overdue pill badge.
- **Summary Cards:** Original Amount, Paid Amount, Outstanding Amount, Due Date.
- **Action Bar:** "Bayar Tagihan", "Tutup (Write-Off)" (visibility governed by State Machine & Role Matrix).
- **Payment Allocations Table:** Date, Amount, Payment Method, Reference, Status (Valid / Reversed), Actions ("Reverse" button for valid allocations, Owner only).

### 19.4. Payment Modal

- Shows current `outstanding_amount`.
- Input `amount` (validated `> 0` and `<= outstanding_amount`), `payment_method`, `reference`, `notes`.
- Validation errors inline.
- Concurrency handling via API error presentation.

### 19.5. Reversal Modal (Owner Only)

- Requires non-empty `reversal_reason`.
- Displays financial impact warning.
- Post-reversal: allocation marked "Reversed", balance updated.

### 19.6. Close / Write-Off Modal (Owner Only)

- Displays outstanding amount being written off.
- `CLOSED != PAID` explanation.
- Notes optional. Confirmation button.

### 19.7. Reports / Aging (`UtangReports.tsx`)

- **Role Gate:** Owner & Admin only.
- **Aging Summary Cards:** Not Due, 1–15, 16–30, 31–60, > 60.
- **Supplier Debt Breakdown Table:** Supplier Name, Outstanding Balance, Open Payables Count.

---

## 20. VISUAL DESIGN SYSTEM

Follows established KOPERA OS Tailwind CSS design language.
Status Badge Color Mapping:
- `UNPAID` → Red (`bg-red-50 text-red-700 border-red-200`)
- `PARTIAL` → Amber (`bg-amber-50 text-amber-700 border-amber-200`)
- `PAID` → Emerald (`bg-emerald-50 text-emerald-700 border-emerald-200`)
- `CLOSED` → Gray (`bg-gray-100 text-gray-700 border-gray-200`)
- `VOIDED` → Slate (`bg-slate-100 text-slate-500 border-slate-200`)
- `OVERDUE` → Red pill (`bg-red-600 text-white text-xs px-2 py-0.5 rounded-full`)

---

## 21. TEST CONTRACT

### Backend

- Model invariants (UUID, fields, constraints, FK protection)
- Tenant isolation (cross-business returns 404)
- Role enforcement (KASIR denied, ADMIN/OWNER permitted)
- Create payable from CONFIRMED PO
- Create payable from DRAFT PO → REJECT (HTTP 400)
- Create payable from CANCELLED PO → REJECT (HTTP 400)
- Duplicate invoice_number within business → REJECT
- Same invoice_number across businesses → ALLOWED
- Payment recording (partial, full, exact)
- Overpayment → REJECT (HTTP 400)
- Payment on PAID/CLOSED/VOIDED → REJECT (HTTP 400)
- Reversal (Owner-only, mandatory reason)
- Double reversal → REJECT (HTTP 400)
- Reversal on CLOSED → REJECT (HTTP 400)
- Close/Write-off (Owner-only)
- Close preserves historical paid_amount
- Closed + payment → REJECT (HTTP 400)
- Closed + reversal → REJECT (HTTP 400)
- Concurrency (concurrent payment, exactly one succeeds)
- Audit events persistence
- Void semantics (UNPAID PO cancel → VOIDED)

### Frontend

- Types matching contract
- Service contract (8 functions)
- List page (KPI, filters, table, states)
- Create page (PO selection, auto-compute, DP validation)
- Detail page (financial summary, allocation table, modals)
- Payment modal (amount validation, outstanding display, error)
- Reversal modal (reason required, warning)
- Close modal (CLOSED != PAID explanation)
- Reports page (aging buckets, supplier breakdown)
- Role gating (Admin hidden reverse/close, Kasir no access)
- State gating (terminal states hide actions)
- Responsive layout
- Accessibility (labels, keyboard, focus)
- Indonesian Rupiah formatting

---

## 22. OUT OF SCOPE

- Automatic double-entry journal
- AP journal / payment journal automation
- Inventory logic changes
- Purchasing lifecycle rewrite
- Supplier model rewrite
- Refunds
- Gateway integration
- Credit limit
- Late penalties / interest
- Reminders / notification automation
- Payment gateway
- Bank reconciliation
- Reopen payable
- Automatic write-off engine
- Business-specific timezone
- Multi-business aggregation
- Stock/receiving logic
- PurchaseOrder modification or new statuses

---

## 23. LOCKED MODULES (Zero Modification Allowed)

- `apps/sales/`
- `apps/inventory/`
- `apps/customer/`
- `apps/business/`
- `apps/finance/`
- `apps/authentication/`
- `apps/purchasing/`
- `apps/supplier/`
- `frontend/src/pages/OwnerDashboard.tsx`
- `frontend/src/test/OwnerDashboard.test.tsx`

---

## 24. AMENDMENT RULES

1. Any change to this contract requires a formal Amendment.
2. Amendments must not retroactively change approved behavior.
3. Scope additions require explicit human approval.
4. Permission matrix changes require explicit human approval.

---

## 25. ACCEPTANCE CRITERIA

```text
[ ] Tenant isolation enforced (business_id scoping)
[ ] Location isolation (payable.location == PO.location)
[ ] Supplier correctly referenced through PO
[ ] PurchaseOrder relationship 1-to-1 with CONFIRMED status guard
[ ] original_amount computed from PO lines
[ ] No duplicate inventory mutation
[ ] No duplicate purchasing lifecycle
[ ] Atomic financial mutations (transaction.atomic + select_for_update)
[ ] Row locking on all mutations
[ ] No negative outstanding
[ ] No overpayment
[ ] Append-only payment allocations
[ ] Owner-only reversal
[ ] Owner-only close/write-off
[ ] CLOSED != PAID
[ ] Correct aging (5 buckets, server timezone)
[ ] Correct role matrix (KASIR fully denied)
[ ] Audit events for all lifecycle changes
[ ] No accounting automation
[ ] No destructive payment delete
[ ] No reopen endpoint
[ ] PurchaseOrder cancellation blocks partial/paid payable
[ ] Invoice number unique per business
[ ] Cross-business 404
[ ] Frontend matches backend contract
[ ] Full regression (zero new failures)
```

---

GAP-03 HUTANG — CONTRACT LOCK  
STATUS: LOCKED — READY FOR HUMAN APPROVAL
