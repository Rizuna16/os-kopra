export type SaleStatus = "DRAFT" | "COMPLETED" | "VOIDED";

export interface SaleLine {
  id: string;
  variant: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  business: string;
  location: string;
  status: SaleStatus;
  lines: SaleLine[];
  created_at: string;
  updated_at: string;
}

export interface SaleLinePayload {
  variant: string;
  quantity: number;
  unit_price: number;
}

export interface SalePayload {
  location: string;
  status?: SaleStatus;
  lines?: SaleLinePayload[];
}
