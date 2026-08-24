export type BusinessStatus =
  | "ONBOARDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "CLOSED";

export interface BusinessSummary {
  id: string;
  name: string;
  status: BusinessStatus;
  created_at: string;
}

export interface LocationSummary {
  id: string;
  name: string;
}

export interface Plan {
  id: string;
  name: string;
  code: string;
  amount: number;
  currency: string;
  billing_interval: string;
}

export interface SubscriptionSummary {
  id: string;
  business: string;
  status: string;
  created_at: string;
  updated_at: string;
}
