import { apiFetch } from "../lib/apiClient";
import type {
  Receivable,
  CreditSaleCreatePayload,
  ReceivableUpdatePayload,
  PaymentCreatePayload,
  PaymentReversePayload,
  ReceivableClosePayload,
  PiutangReportResponse,
} from "./types";

export type {
  Receivable,
  CreditSaleCreatePayload,
  ReceivableUpdatePayload,
  PaymentCreatePayload,
  PaymentReversePayload,
  ReceivableClosePayload,
  PiutangReportResponse,
};

export async function listReceivables(
  businessId: string,
  params?: {
    location?: string;
    status?: string;
    customer?: string;
    overdue?: string;
    date_from?: string;
    date_to?: string;
  },
): Promise<Receivable[]> {
  const query = new URLSearchParams();
  if (params?.location) query.set("location", params.location);
  if (params?.status) query.set("status", params.status);
  if (params?.customer) query.set("customer", params.customer);
  if (params?.overdue) query.set("overdue", params.overdue);
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);

  const qs = query.toString();
  const path = `/businesses/${businessId}/receivables/${qs ? `?${qs}` : ""}`;
  return apiFetch<Receivable[]>(path);
}

export async function createCreditSale(
  businessId: string,
  payload: CreditSaleCreatePayload,
): Promise<Receivable> {
  return apiFetch<Receivable>(`/businesses/${businessId}/receivables/`, {
    method: "POST",
    body: payload,
  });
}

export async function getReceivable(
  businessId: string,
  receivableId: string,
  locationId?: string,
): Promise<Receivable> {
  const qs = locationId ? `?location=${locationId}` : "";
  return apiFetch<Receivable>(
    `/businesses/${businessId}/receivables/${receivableId}/${qs}`,
  );
}

export async function updateReceivable(
  businessId: string,
  receivableId: string,
  payload: ReceivableUpdatePayload,
): Promise<Receivable> {
  return apiFetch<Receivable>(
    `/businesses/${businessId}/receivables/${receivableId}/`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export async function payReceivable(
  businessId: string,
  receivableId: string,
  payload: PaymentCreatePayload,
): Promise<{ payment: unknown; receivable: Receivable }> {
  return apiFetch<{ payment: unknown; receivable: Receivable }>(
    `/businesses/${businessId}/receivables/${receivableId}/pay/`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function reversePayment(
  businessId: string,
  receivableId: string,
  paymentId: string,
  payload: PaymentReversePayload,
): Promise<{ payment: unknown; receivable: Receivable }> {
  return apiFetch<{ payment: unknown; receivable: Receivable }>(
    `/businesses/${businessId}/receivables/${receivableId}/payments/${paymentId}/reverse/`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function closeReceivable(
  businessId: string,
  receivableId: string,
  payload: ReceivableClosePayload,
): Promise<Receivable> {
  return apiFetch<Receivable>(
    `/businesses/${businessId}/receivables/${receivableId}/close/`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function getReceivableReports(
  businessId: string,
): Promise<PiutangReportResponse> {
  return apiFetch<PiutangReportResponse>(
    `/businesses/${businessId}/receivables/reports/`,
  );
}
