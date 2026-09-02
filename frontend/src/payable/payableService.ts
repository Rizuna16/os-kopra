import { apiFetch } from "../lib/apiClient";
import type {
  Payable,
  PayableCreatePayload,
  PayableUpdatePayload,
  SupplierPaymentCreatePayload,
  SupplierPaymentReversePayload,
  PayableClosePayload,
  PayableReportResponse,
} from "./types";

export type {
  Payable,
  PayableCreatePayload,
  PayableUpdatePayload,
  SupplierPaymentCreatePayload,
  SupplierPaymentReversePayload,
  PayableClosePayload,
  PayableReportResponse,
};

export async function listPayables(
  businessId: string,
  params?: {
    location?: string;
    status?: string;
    supplier?: string;
    overdue?: string;
    date_from?: string;
    date_to?: string;
  },
): Promise<Payable[]> {
  const query = new URLSearchParams();
  if (params?.location) query.set("location", params.location);
  if (params?.status) query.set("status", params.status);
  if (params?.supplier) query.set("supplier", params.supplier);
  if (params?.overdue) query.set("overdue", params.overdue);
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);

  const qs = query.toString();
  const path = `/businesses/${businessId}/payables/${qs ? `?${qs}` : ""}`;
  return apiFetch<Payable[]>(path);
}

export async function createPayable(
  businessId: string,
  payload: PayableCreatePayload,
): Promise<Payable> {
  return apiFetch<Payable>(`/businesses/${businessId}/payables/`, {
    method: "POST",
    body: payload,
  });
}

export async function getPayable(
  businessId: string,
  payableId: string,
  locationId?: string,
): Promise<Payable> {
  const qs = locationId ? `?location=${locationId}` : "";
  return apiFetch<Payable>(
    `/businesses/${businessId}/payables/${payableId}/${qs}`,
  );
}

export async function updatePayable(
  businessId: string,
  payableId: string,
  payload: PayableUpdatePayload,
): Promise<Payable> {
  return apiFetch<Payable>(
    `/businesses/${businessId}/payables/${payableId}/`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export async function payPayable(
  businessId: string,
  payableId: string,
  payload: SupplierPaymentCreatePayload,
): Promise<{ payment: unknown; payable: Payable }> {
  return apiFetch<{ payment: unknown; payable: Payable }>(
    `/businesses/${businessId}/payables/${payableId}/pay/`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function reverseSupplierPayment(
  businessId: string,
  payableId: string,
  paymentId: string,
  payload: SupplierPaymentReversePayload,
): Promise<{ payment: unknown; payable: Payable }> {
  return apiFetch<{ payment: unknown; payable: Payable }>(
    `/businesses/${businessId}/payables/${payableId}/payments/${paymentId}/reverse/`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function closePayable(
  businessId: string,
  payableId: string,
  payload: PayableClosePayload,
): Promise<Payable> {
  return apiFetch<Payable>(
    `/businesses/${businessId}/payables/${payableId}/close/`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function getPayableReports(
  businessId: string,
): Promise<PayableReportResponse> {
  return apiFetch<PayableReportResponse>(
    `/businesses/${businessId}/payables/reports/`,
  );
}
