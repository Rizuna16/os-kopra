export interface CashierShift {
  id: string;
  business: string;
  location: string;
  cashier: string;
  modal_awal: string;
  uang_tunai_aktual: string | null;
  selisih_kas: string | null;
  status: "OPEN" | "CLOSED";
  opened_at: string;
  closed_at: string | null;
  total_penjualan_tunai?: string;
}

export type PaymentMethod = "CASH" | "QRIS" | "TRANSFER";
export type SaleStatus = "DRAFT" | "HELD" | "COMPLETED" | "VOIDED";

export interface SaleLine {
  id?: string;
  variant: string;
  quantity: string;
  unit_price: string;
  applied_promotion?: string | null;
  applied_discount_type?: string | null;
  applied_discount_value?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Sale {
  id: string;
  business: string;
  location: string;
  customer: string | null;
  loyalty_earned: string;
  status: SaleStatus;
  payment_method: PaymentMethod | null;
  shift: string | null;
  lines: SaleLine[];
  created_at: string;
  updated_at: string;
}

export interface SaleCreateInput {
  location: string;
  customer?: string | null;
  status: SaleStatus;
  payment_method?: PaymentMethod | null;
  lines: {
    variant: string;
    quantity: string;
    unit_price: string;
    applied_promotion?: string | null;
  }[];
}

export interface SaleUpdateInput {
  location?: string;
  customer?: string | null;
  status?: SaleStatus;
  payment_method?: PaymentMethod | null;
  lines?: {
    variant: string;
    quantity: string;
    unit_price: string;
    applied_promotion?: string | null;
  }[];
}
