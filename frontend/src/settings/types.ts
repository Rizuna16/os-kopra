export interface BusinessSettings {
  id: string;
  name: string;
  business_type: string;
  logo_url: string | null;
  brand_color: string | null;
  tagline: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TaxSettings {
  id: string;
  business: string;
  tax_rate: number | string;
  tax_name: string;
  tax_inclusive: boolean;
  created_at: string;
  updated_at: string;
}

export interface CurrencySettings {
  id: string;
  business: string;
  currency_code: string;
  currency_symbol: string;
  decimal_places: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceSettings {
  id: string;
  business: string;
  invoice_prefix: string;
  invoice_next_number: number;
  invoice_notes: string;
  invoice_footer: string;
  created_at: string;
  updated_at: string;
}

export interface ReceiptSettings {
  id: string;
  business: string;
  receipt_prefix: string;
  receipt_next_number: number;
  receipt_notes: string;
  receipt_footer: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user: string;
  business: string;
  receive_stock_alerts: boolean;
  receive_order_alerts: boolean;
  receive_payment_alerts: boolean;
  receive_subscription_alerts: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationSettings {
  id: string;
  business: string;
  storefront_url: string | null;
  webhook_url: string | null;
  api_docs_url: string;
  created_at: string;
  updated_at: string;
}
