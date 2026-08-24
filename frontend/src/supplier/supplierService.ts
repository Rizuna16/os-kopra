import { apiFetch } from "../lib/apiClient";
import type { Supplier, SupplierPayload, SupplierUpdatePayload } from "./types";

export type { Supplier, SupplierPayload, SupplierUpdatePayload };

export async function listSuppliers(businessId: string): Promise<Supplier[]> {
  return apiFetch<Supplier[]>(`/businesses/${businessId}/suppliers/`);
}

export async function getSupplier(
  businessId: string,
  supplierId: string,
): Promise<Supplier> {
  return apiFetch<Supplier>(
    `/businesses/${businessId}/suppliers/${supplierId}/`,
  );
}

export async function createSupplier(
  businessId: string,
  payload: SupplierPayload,
): Promise<Supplier> {
  return apiFetch<Supplier>(`/businesses/${businessId}/suppliers/`, {
    method: "POST",
    body: payload,
  });
}

export async function updateSupplier(
  businessId: string,
  supplierId: string,
  payload: SupplierUpdatePayload,
): Promise<Supplier> {
  return apiFetch<Supplier>(
    `/businesses/${businessId}/suppliers/${supplierId}/`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export async function deleteSupplier(
  businessId: string,
  supplierId: string,
): Promise<void> {
  await apiFetch<void>(
    `/businesses/${businessId}/suppliers/${supplierId}/`,
    {
      method: "DELETE",
    },
  );
}
