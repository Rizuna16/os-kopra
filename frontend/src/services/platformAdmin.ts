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
