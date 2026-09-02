/**
 * GAP-03 HUTANG — Frontend Type Contract
 * Source of Truth: GAP-03-HUTANG-CONTRACT-LOCK.md
 */

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
