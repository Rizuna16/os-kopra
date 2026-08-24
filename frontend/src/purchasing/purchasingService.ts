import { apiFetch } from "../lib/apiClient";
import type { PurchaseOrder, PurchaseOrderPayload } from "./types";

export type {
  PurchaseOrder,
  PurchaseOrderPayload,
  PurchaseOrderLine,
  PurchaseOrderStatus,
  PurchaseOrderLinePayload,
} from "./types";

export async function listPurchaseOrders(
  businessId: string,
): Promise<PurchaseOrder[]> {
  return apiFetch<PurchaseOrder[]>(
    `/businesses/${businessId}/purchase-orders/`,
  );
}

export async function getPurchaseOrder(
  businessId: string,
  id: string,
): Promise<PurchaseOrder> {
  return apiFetch<PurchaseOrder>(
    `/businesses/${businessId}/purchase-orders/${id}/`,
  );
}

export async function createPurchaseOrder(
  businessId: string,
  payload: PurchaseOrderPayload,
): Promise<PurchaseOrder> {
  return apiFetch<PurchaseOrder>(
    `/businesses/${businessId}/purchase-orders/`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function updatePurchaseOrder(
  businessId: string,
  id: string,
  payload: Partial<PurchaseOrderPayload>,
): Promise<PurchaseOrder> {
  return apiFetch<PurchaseOrder>(
    `/businesses/${businessId}/purchase-orders/${id}/`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export async function deletePurchaseOrder(
  businessId: string,
  id: string,
): Promise<void> {
  await apiFetch<void>(`/businesses/${businessId}/purchase-orders/${id}/`, {
    method: "DELETE",
  });
}
