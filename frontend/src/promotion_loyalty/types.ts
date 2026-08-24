export type DiscountType = "PERCENTAGE" | "FIXED";
export type PromotionStatus = "ACTIVE" | "INACTIVE";
export type Applicability = "BUSINESS_WIDE" | "PRODUCT_VARIANT";
export type LoyaltyProgramStatus = "ACTIVE" | "INACTIVE";

export interface Promotion {
  id: string;
  business: string;
  name: string;
  discount_type: DiscountType;
  discount_value: number | string;
  valid_from: string;
  valid_to: string;
  status: PromotionStatus;
  applicability: Applicability;
  target_product: string | null;
  target_variant: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromotionPayload {
  name: string;
  discount_type: DiscountType;
  discount_value: number | string;
  valid_from: string;
  valid_to: string;
  status?: PromotionStatus;
  applicability?: Applicability;
  target_product?: string | null;
  target_variant?: string | null;
}

export interface PromotionUpdatePayload {
  name?: string;
  discount_type?: DiscountType;
  discount_value?: number | string;
  valid_from?: string;
  valid_to?: string;
  status?: PromotionStatus;
  applicability?: Applicability;
  target_product?: string | null;
  target_variant?: string | null;
}

export interface LoyaltyProgram {
  id: string;
  business: string;
  name: string;
  status: LoyaltyProgramStatus;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyProgramPayload {
  name: string;
  status?: LoyaltyProgramStatus;
}

export interface LoyaltyProgramUpdatePayload {
  name?: string;
  status?: LoyaltyProgramStatus;
}

export interface CustomerLoyaltyRecord {
  id: string;
  business: string;
  program: string;
  customer: string;
  points_balance: number | string;
  created_at: string;
  updated_at: string;
}

export interface CustomerLoyaltyRecordPayload {
  customer: string;
  points_balance?: number | string;
}

export interface CustomerLoyaltyRecordUpdatePayload {
  points_balance?: number | string;
}
