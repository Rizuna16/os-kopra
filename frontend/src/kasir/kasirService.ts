import { apiFetch } from "../lib/apiClient";
import type { CashierShift, Sale, SaleCreateInput, SaleUpdateInput } from "./types";

export async function listShifts(
  businessId: string,
  params?: { location?: string; status?: "OPEN" | "CLOSED" }
): Promise<CashierShift[]> {
  let query = "";
  if (params) {
    const parts: string[] = [];
    if (params.location) parts.push(`location=${params.location}`);
    if (params.status) parts.push(`status=${params.status}`);
    if (parts.length > 0) query = `?${parts.join("&")}`;
  }
  return apiFetch<CashierShift[]>(`/businesses/${businessId}/shifts/${query}`);
}

export async function openShift(
  businessId: string,
  locationId: string,
  modalAwal: string
): Promise<CashierShift> {
  return apiFetch<CashierShift>(`/businesses/${businessId}/shifts/`, {
    method: "POST",
    body: {
      location: locationId,
      modal_awal: modalAwal,
    },
  });
}

export async function closeShift(
  businessId: string,
  shiftId: string,
  uangTunaiAktual: string
): Promise<CashierShift> {
  return apiFetch<CashierShift>(`/businesses/${businessId}/shifts/${shiftId}/close/`, {
    method: "POST",
    body: {
      uang_tunai_aktual: uangTunaiAktual,
    },
  });
}

export async function listSales(businessId: string): Promise<Sale[]> {
  return apiFetch<Sale[]>(`/businesses/${businessId}/sales/`);
}

export async function createSale(
  businessId: string,
  payload: SaleCreateInput
): Promise<Sale> {
  return apiFetch<Sale>(`/businesses/${businessId}/sales/`, {
    method: "POST",
    body: payload,
  });
}

export async function updateSale(
  businessId: string,
  saleId: string,
  payload: SaleUpdateInput
): Promise<Sale> {
  return apiFetch<Sale>(`/businesses/${businessId}/sales/${saleId}/`, {
    method: "PATCH",
    body: payload,
  });
}
