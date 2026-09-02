/**
 * GAP-02 PIUTANG — Frontend Type Contract
 * Source of Truth: GAP-02-PIUTANG-FRONTEND-CONTRACT-LOCK.md
 * These types must exactly match the backend API contract.
 */

export type ReceivableStatus = "UNPAID" | "PARTIAL" | "PAID" | "VOIDED" | "CLOSED";

export type PaymentMethodChoice = "CASH" | "QRIS" | "TRANSFER";

export interface PaymentAllocation {
  id: string;
  business: string;
  receivable: string;
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

export interface CustomerSummary {
  id: string;
  name: string;
}

export interface LocationSummary {
  id: string;
  name: string;
}

export interface Receivable {
  id: string;
  business: string;
  location: string;
  customer: string;
  sale: string;
  invoice_number: string;
  original_amount: string;
  paid_amount: string;
  outstanding_amount: string;
  status: ReceivableStatus;
  due_date: string | null;
  is_overdue: boolean;
  notes: string;
  allocations: PaymentAllocation[];
  created_at: string;
  updated_at: string;
}

export interface CreditSaleLinePayload {
  variant: string;
  quantity: string;
  unit_price: string;
  applied_promotion?: string | null;
}

export interface CreditSaleCreatePayload {
  location: string;
  customer: string;
  lines: CreditSaleLinePayload[];
  initial_payment?: string;
  payment_method?: PaymentMethodChoice;
  due_date?: string | null;
  notes?: string;
  reference?: string;
  invoice_number?: string;
}

export interface ReceivableUpdatePayload {
  due_date?: string | null;
  notes?: string;
}

export interface PaymentCreatePayload {
  amount: string;
  payment_method: PaymentMethodChoice;
  reference?: string;
  notes?: string;
}

export interface PaymentReversePayload {
  reversal_reason: string;
}

export interface ReceivableClosePayload {
  notes?: string;
}

export interface PiutangAgingSummary {
  not_due: string;
  days_1_15: string;
  days_16_30: string;
  days_31_60: string;
  over_60_days: string;
}

export interface CustomerDebtSummary {
  customer_id: string;
  customer_name: string;
  outstanding: string;
  open_receivables_count: number;
}

export interface PiutangReportResponse {
  total_outstanding: string;
  total_overdue: string;
  count_customers_with_debt: number;
  aging_summary: PiutangAgingSummary;
  receivables_by_customer: CustomerDebtSummary[];
}

// export type { ReceivableStatus, PaymentMethodChoice };