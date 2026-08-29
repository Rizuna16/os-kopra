import { apiFetch } from "../lib/apiClient";
import { ApiError } from "../auth/types";

export interface PlatformSubscription {
  id: string;
  business_id: string;
  business_name: string | null;
  owner_id: string | null;
  owner_email: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface PlatformPlan {
  id: string;
  name: string;
  code: string;
  amount: string;
  currency: string;
  billing_interval: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface PlanInput {
  name: string;
  code: string;
  amount: number | string;
  billing_interval: string;
  is_active?: boolean;
  currency?: string;
}

export async function listPlatformSubscriptions(): Promise<PlatformSubscription[]> {
  const data = await apiFetch<PlatformSubscription[]>("/admin/subscriptions/");
  return Array.isArray(data) ? data : [];
}

export async function getPlatformSubscription(
  id: string,
): Promise<PlatformSubscription> {
  return apiFetch<PlatformSubscription>(`/admin/subscriptions/${id}/`);
}

export async function listPlatformPlans(): Promise<PlatformPlan[]> {
  const data = await apiFetch<PlatformPlan[]>("/admin/plans/");
  return Array.isArray(data) ? data : [];
}

export async function getPlatformPlan(id: string): Promise<PlatformPlan> {
  return apiFetch<PlatformPlan>(`/admin/plans/${id}/`);
}

export async function createPlatformPlan(input: PlanInput): Promise<PlatformPlan> {
  return apiFetch<PlatformPlan>("/admin/plans/", {
    method: "POST",
    body: input,
  });
}

export async function updatePlatformPlan(
  id: string,
  input: Partial<PlanInput>,
): Promise<PlatformPlan> {
  return apiFetch<PlatformPlan>(`/admin/plans/${id}/`, {
    method: "PATCH",
    body: input,
  });
}

export async function enablePlatformPlan(id: string): Promise<PlatformPlan> {
  return apiFetch<PlatformPlan>(`/admin/plans/${id}/enable/`, {
    method: "POST",
    body: {},
  });
}

export async function disablePlatformPlan(id: string): Promise<PlatformPlan> {
  return apiFetch<PlatformPlan>(`/admin/plans/${id}/disable/`, {
    method: "POST",
    body: {},
  });
}

export function isForbidden(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403;
}

// ============================================================
// DOMAIN 10 — FEATURE & MODULE MANAGEMENT
// ============================================================

export interface PlatformModule {
  id: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ModuleInput {
  code: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface PlatformFeature {
  id: string;
  module: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  is_beta: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface FeatureInput {
  module: string;
  code: string;
  name: string;
  description?: string;
  is_active?: boolean;
  is_beta?: boolean;
}

export interface PlatformPlanFeature {
  id: string;
  plan: string;
  feature: string;
  is_enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface PlatformBusinessFeatureOverride {
  id: string;
  business: string;
  feature: string;
  state: "INHERIT" | "ENABLED" | "DISABLED";
  created_at: string | null;
  updated_at: string | null;
}

export async function listPlatformModules(): Promise<PlatformModule[]> {
  const data = await apiFetch<PlatformModule[]>("/admin/modules/");
  return Array.isArray(data) ? data : [];
}

export async function createPlatformModule(input: ModuleInput): Promise<PlatformModule> {
  return apiFetch<PlatformModule>("/admin/modules/", {
    method: "POST",
    body: input,
  });
}

export async function getPlatformModule(id: string): Promise<PlatformModule> {
  return apiFetch<PlatformModule>(`/admin/modules/${id}/`);
}

export async function updatePlatformModule(
  id: string,
  input: Partial<ModuleInput>,
): Promise<PlatformModule> {
  return apiFetch<PlatformModule>(`/admin/modules/${id}/`, {
    method: "PATCH",
    body: input,
  });
}

export async function enablePlatformModule(id: string): Promise<PlatformModule> {
  return apiFetch<PlatformModule>(`/admin/modules/${id}/enable/`, {
    method: "POST",
    body: {},
  });
}

export async function disablePlatformModule(id: string): Promise<PlatformModule> {
  return apiFetch<PlatformModule>(`/admin/modules/${id}/disable/`, {
    method: "POST",
    body: {},
  });
}

export async function listPlatformFeatures(): Promise<PlatformFeature[]> {
  const data = await apiFetch<PlatformFeature[]>("/admin/features/");
  return Array.isArray(data) ? data : [];
}

export async function createPlatformFeature(input: FeatureInput): Promise<PlatformFeature> {
  return apiFetch<PlatformFeature>("/admin/features/", {
    method: "POST",
    body: input,
  });
}

export async function getPlatformFeature(id: string): Promise<PlatformFeature> {
  return apiFetch<PlatformFeature>(`/admin/features/${id}/`);
}

export async function updatePlatformFeature(
  id: string,
  input: Partial<FeatureInput>,
): Promise<PlatformFeature> {
  return apiFetch<PlatformFeature>(`/admin/features/${id}/`, {
    method: "PATCH",
    body: input,
  });
}

export async function enablePlatformFeature(id: string): Promise<PlatformFeature> {
  return apiFetch<PlatformFeature>(`/admin/features/${id}/enable/`, {
    method: "POST",
    body: {},
  });
}

export async function disablePlatformFeature(id: string): Promise<PlatformFeature> {
  return apiFetch<PlatformFeature>(`/admin/features/${id}/disable/`, {
    method: "POST",
    body: {},
  });
}

export async function listPlanFeatures(planId: string): Promise<PlatformPlanFeature[]> {
  const data = await apiFetch<PlatformPlanFeature[]>(
    `/admin/plans/${planId}/features/`,
  );
  return Array.isArray(data) ? data : [];
}

export async function assignPlanFeature(
  planId: string,
  featureId: string,
  isEnabled = true,
): Promise<PlatformPlanFeature> {
  return apiFetch<PlatformPlanFeature>(`/admin/plans/${planId}/features/`, {
    method: "POST",
    body: { feature: featureId, is_enabled: isEnabled },
  });
}

export async function removePlanFeature(
  planId: string,
  featureId: string,
): Promise<void> {
  await apiFetch<void>(`/admin/plans/${planId}/features/${featureId}/`, {
    method: "DELETE",
  });
}

export async function listBusinessFeatures(
  businessId: string,
): Promise<PlatformBusinessFeatureOverride[]> {
  const data = await apiFetch<PlatformBusinessFeatureOverride[]>(
    `/admin/businesses/${businessId}/features/`,
  );
  return Array.isArray(data) ? data : [];
}

export async function updateBusinessFeatureOverride(
  businessId: string,
  featureId: string,
  state: "INHERIT" | "ENABLED" | "DISABLED",
): Promise<PlatformBusinessFeatureOverride> {
  return apiFetch<PlatformBusinessFeatureOverride>(
    `/admin/businesses/${businessId}/features/${featureId}/`,
    {
      method: "PATCH",
      body: { state },
    },
  );
}

export interface PlatformPaymentPlan {
  id: string;
  name: string;
  code: string;
  amount: string;
  currency: string;
  billing_interval: string;
}

export interface PlatformPayment {
  id: string;
  subscription_id: string | null;
  business_id: string | null;
  business_name: string | null;
  owner_id: string | null;
  owner_email: string | null;
  plan: PlatformPaymentPlan | null;
  amount: string;
  currency: string;
  status: string;
  provider: string;
  provider_reference: string;
  paid_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PlatformBillingSummary {
  total_payments: number;
  total_paid_payments: number;
  total_pending: number;
  total_failed: number;
  total_expired: number;
  total_canceled: number;
  valid_paid_revenue: string;
}

export async function listPlatformPayments(): Promise<PlatformPayment[]> {
  const data = await apiFetch<PlatformPayment[]>("/admin/payments/");
  return Array.isArray(data) ? data : [];
}

export async function getPlatformPayment(id: string): Promise<PlatformPayment> {
  return apiFetch<PlatformPayment>(`/admin/payments/${id}/`);
}

export async function getPlatformBillingSummary(): Promise<PlatformBillingSummary> {
  return apiFetch<PlatformBillingSummary>("/admin/billing/summary/");
}
