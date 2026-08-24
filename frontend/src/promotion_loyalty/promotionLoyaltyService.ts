import { apiFetch } from "../lib/apiClient";
import type {
  Promotion,
  PromotionPayload,
  PromotionUpdatePayload,
  LoyaltyProgram,
  LoyaltyProgramPayload,
  LoyaltyProgramUpdatePayload,
  CustomerLoyaltyRecord,
  CustomerLoyaltyRecordPayload,
  CustomerLoyaltyRecordUpdatePayload,
} from "./types";

export type {
  Promotion,
  PromotionPayload,
  PromotionUpdatePayload,
  LoyaltyProgram,
  LoyaltyProgramPayload,
  LoyaltyProgramUpdatePayload,
  CustomerLoyaltyRecord,
  CustomerLoyaltyRecordPayload,
  CustomerLoyaltyRecordUpdatePayload,
};

// --- Promotions ---
export async function listPromotions(businessId: string): Promise<Promotion[]> {
  return apiFetch<Promotion[]>(`/businesses/${businessId}/promotions/`);
}

export async function getPromotion(
  businessId: string,
  promotionId: string,
): Promise<Promotion> {
  return apiFetch<Promotion>(
    `/businesses/${businessId}/promotions/${promotionId}/`,
  );
}

export async function createPromotion(
  businessId: string,
  payload: PromotionPayload,
): Promise<Promotion> {
  return apiFetch<Promotion>(`/businesses/${businessId}/promotions/`, {
    method: "POST",
    body: payload,
  });
}

export async function updatePromotion(
  businessId: string,
  promotionId: string,
  payload: PromotionUpdatePayload,
): Promise<Promotion> {
  return apiFetch<Promotion>(
    `/businesses/${businessId}/promotions/${promotionId}/`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export async function deletePromotion(
  businessId: string,
  promotionId: string,
): Promise<void> {
  await apiFetch<void>(
    `/businesses/${businessId}/promotions/${promotionId}/`,
    {
      method: "DELETE",
    },
  );
}

// --- Loyalty Programs ---
export async function listLoyaltyPrograms(
  businessId: string,
): Promise<LoyaltyProgram[]> {
  return apiFetch<LoyaltyProgram[]>(`/businesses/${businessId}/loyalty-programs/`);
}

export async function getLoyaltyProgram(
  businessId: string,
  programId: string,
): Promise<LoyaltyProgram> {
  return apiFetch<LoyaltyProgram>(
    `/businesses/${businessId}/loyalty-programs/${programId}/`,
  );
}

export async function createLoyaltyProgram(
  businessId: string,
  payload: LoyaltyProgramPayload,
): Promise<LoyaltyProgram> {
  return apiFetch<LoyaltyProgram>(`/businesses/${businessId}/loyalty-programs/`, {
    method: "POST",
    body: payload,
  });
}

export async function updateLoyaltyProgram(
  businessId: string,
  programId: string,
  payload: LoyaltyProgramUpdatePayload,
): Promise<LoyaltyProgram> {
  return apiFetch<LoyaltyProgram>(
    `/businesses/${businessId}/loyalty-programs/${programId}/`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export async function deleteLoyaltyProgram(
  businessId: string,
  programId: string,
): Promise<void> {
  await apiFetch<void>(
    `/businesses/${businessId}/loyalty-programs/${programId}/`,
    {
      method: "DELETE",
    },
  );
}

// --- Customer Loyalty Records (nested under program) ---
export async function listCustomerLoyaltyRecords(
  businessId: string,
  programId: string,
): Promise<CustomerLoyaltyRecord[]> {
  return apiFetch<CustomerLoyaltyRecord[]>(
    `/businesses/${businessId}/loyalty-programs/${programId}/customers/`,
  );
}

export async function getCustomerLoyaltyRecord(
  businessId: string,
  programId: string,
  recordId: string,
): Promise<CustomerLoyaltyRecord> {
  return apiFetch<CustomerLoyaltyRecord>(
    `/businesses/${businessId}/loyalty-programs/${programId}/customers/${recordId}/`,
  );
}

export async function createCustomerLoyaltyRecord(
  businessId: string,
  programId: string,
  payload: CustomerLoyaltyRecordPayload,
): Promise<CustomerLoyaltyRecord> {
  return apiFetch<CustomerLoyaltyRecord>(
    `/businesses/${businessId}/loyalty-programs/${programId}/customers/`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function updateCustomerLoyaltyRecord(
  businessId: string,
  programId: string,
  recordId: string,
  payload: CustomerLoyaltyRecordUpdatePayload,
): Promise<CustomerLoyaltyRecord> {
  return apiFetch<CustomerLoyaltyRecord>(
    `/businesses/${businessId}/loyalty-programs/${programId}/customers/${recordId}/`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export async function deleteCustomerLoyaltyRecord(
  businessId: string,
  programId: string,
  recordId: string,
): Promise<void> {
  await apiFetch<void>(
    `/businesses/${businessId}/loyalty-programs/${programId}/customers/${recordId}/`,
    {
      method: "DELETE",
    },
  );
}
