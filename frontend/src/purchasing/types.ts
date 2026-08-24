export type PurchaseOrderStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface PurchaseOrderLine {
  id: string;
  variant: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  business: string;
  supplier: string;
  location: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderLinePayload {
  variant: string;
  quantity: number;
  unit_price: number;
}

export interface PurchaseOrderPayload {
  supplier: string;
  location: string;
  status?: PurchaseOrderStatus;
  lines?: PurchaseOrderLinePayload[];
}
