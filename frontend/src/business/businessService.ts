import { apiFetch } from "../lib/apiClient";
import type {
  BusinessSummary,
  LocationSummary,
  PaymentResponse,
  Plan,
  SubscriptionSummary,
} from "./types";

export type { PaymentResponse };

export async function createBusiness(name: string, businessType: string): Promise<BusinessSummary> {
  return await apiFetch<BusinessSummary>("/businesses/", {
    method: "POST",
    body: { name, business_type: businessType },
  });
}

export async function listLocations(
  businessId: string,
): Promise<LocationSummary[]> {
  return await apiFetch<LocationSummary[]>(
    `/businesses/${businessId}/locations/`,
  );
}

export async function createLocation(
  businessId: string,
  name: string,
): Promise<LocationSummary> {
  return await apiFetch<LocationSummary>(
    `/businesses/${businessId}/locations/`,
    {
      method: "POST",
      body: { name },
    },
  );
}

export async function createSubscription(
  businessId: string,
): Promise<SubscriptionSummary> {
  return await apiFetch<SubscriptionSummary>(
    `/businesses/${businessId}/subscription/`,
    {
      method: "POST",
      body: {},
    },
  );
}

export async function listPlans(): Promise<Plan[]> {
  return await apiFetch<Plan[]>("/billing/plans/");
}

export async function createPayment(
  subscriptionId: string,
  planId: string,
): Promise<PaymentResponse> {
  return await apiFetch<PaymentResponse>("/billing/payments/", {
    method: "POST",
    body: {
      subscription_id: subscriptionId,
      plan_id: planId,
    },
  });
}
