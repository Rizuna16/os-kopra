export interface Supplier {
  id: string;
  business: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface SupplierUpdatePayload {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}
