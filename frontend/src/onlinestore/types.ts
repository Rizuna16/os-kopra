export interface OnlineStoreSummary {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface OnlineStoreDetail {
  id: string;
  business: string;
  name: string;
  slug: string;
  default_location: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnlineStoreProductSummary {
  id: string;
  product: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnlineStoreProductDetail {
  id: string;
  online_store: string;
  product: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnlineOrderSummary {
  id: string;
  online_store: string;
  status: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  shipping_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnlineOrderDetail {
  id: string;
  online_store: string;
  customer: string | null;
  sale: string | null;
  status: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  shipping_address: string | null;
  lines: OnlineOrderLineDetail[];
  created_at: string;
  updated_at: string;
}

export interface OnlineOrderLineDetail {
  id: string;
  variant: string;
  quantity: string;
  unit_price: string;
}

export interface CartSummary {
  id: string;
  online_store: string;
  session_token: string;
  customer: string | null;
  items: CartItemDetail[];
  created_at: string;
  updated_at: string;
}

export interface CartItemDetail {
  id: string;
  variant: string;
  quantity: string;
  product_name: string;
  price: string;
}

export interface CheckoutInput {
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  shipping_address: string;
  lines: CheckoutLineInput[];
}

export interface CheckoutLineInput {
  variant: string;
  quantity: string;
}