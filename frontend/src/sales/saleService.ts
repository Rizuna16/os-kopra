import { apiFetch } from "../lib/apiClient";
import type { Sale, SalePayload } from "./types";

export type {
  Sale,
  SalePayload,
  SaleLine,
  SaleStatus,
  SaleLinePayload,
} from "./types";

export async function listSales(businessId: string): Promise<Sale[]> {
  return apiFetch<Sale[]>(`/businesses/${businessId}/sales/`);
}

export async function getSale(businessId: string, id: string): Promise<Sale> {
  return apiFetch<Sale>(`/businesses/${businessId}/sales/${id}/`);
}

export async function createSale(
  businessId: string,
  payload: SalePayload,
): Promise<Sale> {
  return apiFetch<Sale>(`/businesses/${businessId}/sales/`, {
    method: "POST",
    body: payload,
  });
}

export async function updateSale(
  businessId: string,
  id: string,
  payload: Partial<SalePayload>,
): Promise<Sale> {
  return apiFetch<Sale>(`/businesses/${businessId}/sales/${id}/`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteSale(
  businessId: string,
  id: string,
): Promise<void> {
  await apiFetch<void>(`/businesses/${businessId}/sales/${id}/`, {
    method: "DELETE",
  });
}
