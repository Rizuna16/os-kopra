import { apiFetch } from "../lib/apiClient";
import type {
  BusinessSummary,
  LocationSummary,
  Plan,
  SubscriptionSummary,
} from "./types";

export async function createBusiness(name: string): Promise<BusinessSummary> {
  return await apiFetch<BusinessSummary>("/businesses/", {
    method: "POST",
    body: { name },
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
