export interface Customer {
  id: string;
  business: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface CustomerUpdatePayload {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}
