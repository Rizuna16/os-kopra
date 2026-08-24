export interface Stock {
  id: string;
  location: string;
  variant: string;
  quantity: string;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  code: string;
  location: string;
  variant: string;
  quantity: string;
  expired_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SerialNumber {
  id: string;
  batch: string;
  serial_number: string;
  created_at: string;
  updated_at: string;
}

export interface TransferResponse {
  source: Stock;
  destination: { id: string; location: string; variant: string; quantity: string; created_at: string; updated_at: string };
  transferred_quantity: string;
}

export interface OpnameResponse {
  Stock?: Stock;
  detail?: string;
}

export interface StockPayload {
  variant_id: string;
  quantity: number | string;
}

export interface StockUpdatePayload {
  quantity: number | string;
}

export interface BatchPayload {
  code: string;
  location: string;
  variant: string;
  quantity: number | string;
  expired_date: string | null;
}

export interface BatchUpdatePayload {
  code?: string;
  quantity?: number | string;
  expired_date?: string | null;
}

export interface SerialPayload {
  batch: string;
  serial_number: string;
}

export interface SerialUpdatePayload {
  serial_number?: string;
}