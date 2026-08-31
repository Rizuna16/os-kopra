import { apiFetch } from "../lib/apiClient";
import type {
  BusinessSettings,
  TaxSettings,
  CurrencySettings,
  InvoiceSettings,
  ReceiptSettings,
  NotificationPreferences,
  IntegrationSettings,
} from "./types";

export async function getBusinessSettings(businessId: string): Promise<BusinessSettings> {
  return await apiFetch<BusinessSettings>(`/businesses/${businessId}/settings/business/`);
}

export async function updateBusinessSettings(
  businessId: string,
  data: Partial<BusinessSettings>
): Promise<BusinessSettings> {
  return await apiFetch<BusinessSettings>(`/businesses/${businessId}/settings/business/`, {
    method: "PATCH",
    body: data,
  });
}

export async function getTaxSettings(businessId: string): Promise<TaxSettings> {
  return await apiFetch<TaxSettings>(`/businesses/${businessId}/settings/tax/`);
}

export async function updateTaxSettings(
  businessId: string,
  data: Partial<TaxSettings>
): Promise<TaxSettings> {
  return await apiFetch<TaxSettings>(`/businesses/${businessId}/settings/tax/`, {
    method: "PATCH",
    body: data,
  });
}

export async function getCurrencySettings(businessId: string): Promise<CurrencySettings> {
  return await apiFetch<CurrencySettings>(`/businesses/${businessId}/settings/currency/`);
}

export async function updateCurrencySettings(
  businessId: string,
  data: Partial<CurrencySettings>
): Promise<CurrencySettings> {
  return await apiFetch<CurrencySettings>(`/businesses/${businessId}/settings/currency/`, {
    method: "PATCH",
    body: data,
  });
}

export async function getInvoiceSettings(businessId: string): Promise<InvoiceSettings> {
  return await apiFetch<InvoiceSettings>(`/businesses/${businessId}/settings/invoice/`);
}

export async function updateInvoiceSettings(
  businessId: string,
  data: Partial<InvoiceSettings>
): Promise<InvoiceSettings> {
  return await apiFetch<InvoiceSettings>(`/businesses/${businessId}/settings/invoice/`, {
    method: "PATCH",
    body: data,
  });
}

export async function getReceiptSettings(businessId: string): Promise<ReceiptSettings> {
  return await apiFetch<ReceiptSettings>(`/businesses/${businessId}/settings/receipt/`);
}

export async function updateReceiptSettings(
  businessId: string,
  data: Partial<ReceiptSettings>
): Promise<ReceiptSettings> {
  return await apiFetch<ReceiptSettings>(`/businesses/${businessId}/settings/receipt/`, {
    method: "PATCH",
    body: data,
  });
}

export async function getNotificationPreferences(businessId: string): Promise<NotificationPreferences> {
  return await apiFetch<NotificationPreferences>(`/businesses/${businessId}/settings/notifications/`);
}

export async function updateNotificationPreferences(
  businessId: string,
  data: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  return await apiFetch<NotificationPreferences>(`/businesses/${businessId}/settings/notifications/`, {
    method: "PATCH",
    body: data,
  });
}

export async function getIntegrationSettings(businessId: string): Promise<IntegrationSettings> {
  return await apiFetch<IntegrationSettings>(`/businesses/${businessId}/settings/integration/`);
}

export async function updateIntegrationSettings(
  businessId: string,
  data: Partial<IntegrationSettings>
): Promise<IntegrationSettings> {
  return await apiFetch<IntegrationSettings>(`/businesses/${businessId}/settings/integration/`, {
    method: "PATCH",
    body: data,
  });
}
