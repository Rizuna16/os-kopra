import { apiFetch } from "../lib/apiClient";
import type {
  Stock,
  Batch,
  SerialNumber,
  TransferResponse,
  OpnameResponse,
  StockPayload,
  StockUpdatePayload,
  BatchPayload,
  BatchUpdatePayload,
  SerialPayload,
  SerialUpdatePayload,
} from "./types";

export type {
  Stock,
  Batch,
  SerialNumber,
  TransferResponse,
  OpnameResponse,
} from "./types";

export async function listStocks(
  businessId: string,
  locationId: string,
): Promise<Stock[]> {
  return apiFetch<Stock[]>(
    `/businesses/${businessId}/locations/${locationId}/stocks/`,
  );
}

export async function createStock(
  businessId: string,
  locationId: string,
  payload: StockPayload,
): Promise<Stock> {
  return apiFetch<Stock>(
    `/businesses/${businessId}/locations/${locationId}/stocks/`,
    { method: "POST", body: payload },
  );
}

export async function getStock(stockId: string): Promise<Stock> {
  return apiFetch<Stock>(`/api/stocks/${stockId}/`);
}

export async function updateStock(
  stockId: string,
  payload: StockUpdatePayload,
): Promise<Stock> {
  return apiFetch<Stock>(`/api/stocks/${stockId}/`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteStock(stockId: string): Promise<void> {
  await apiFetch<void>(`/api/stocks/${stockId}/`, { method: "DELETE" });
}

export async function transferStock(payload: {
  source_location: string;
  destination_location: string;
  variant: string;
  quantity: number | string;
}): Promise<TransferResponse> {
  return apiFetch<TransferResponse>(`/stocks/transfer/`, {
    method: "POST",
    body: payload,
  });
}

export async function adjustStock(payload: {
  location: string;
  variant: string;
  quantity: number | string;
}): Promise<Stock> {
  return apiFetch<Stock>(`/stocks/adjustment/`, {
    method: "POST",
    body: payload,
  });
}

export async function opnameStock(payload: {
  location: string;
  variant: string;
  quantity: number | string;
}): Promise<Stock | { detail: string }> {
  return apiFetch<Stock | { detail: string }>(`/stocks/opname/`, {
    method: "POST",
    body: payload,
  });
}

export async function listBatches(): Promise<Batch[]> {
  return apiFetch<Batch[]>(`/inventory/batches/`);
}

export async function createBatch(payload: BatchPayload): Promise<Batch> {
  return apiFetch<Batch>(`/inventory/batches/`, {
    method: "POST",
    body: payload,
  });
}

export async function getBatch(batchId: string): Promise<Batch> {
  return apiFetch<Batch>(`/inventory/batches/${batchId}/`);
}

export async function updateBatch(
  batchId: string,
  payload: BatchUpdatePayload,
): Promise<Batch> {
  return apiFetch<Batch>(`/inventory/batches/${batchId}/`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteBatch(batchId: string): Promise<void> {
  await apiFetch<void>(`/inventory/batches/${batchId}/`, {
    method: "DELETE",
  });
}

export async function listSerials(): Promise<SerialNumber[]> {
  return apiFetch<SerialNumber[]>(`/inventory/serial-numbers/`);
}

export async function createSerial(payload: SerialPayload): Promise<SerialNumber> {
  return apiFetch<SerialNumber>(`/inventory/serial-numbers/`, {
    method: "POST",
    body: payload,
  });
}

export async function getSerial(serialId: string): Promise<SerialNumber> {
  return apiFetch<SerialNumber>(`/inventory/serial-numbers/${serialId}/`);
}

export async function updateSerial(
  serialId: string,
  payload: SerialUpdatePayload,
): Promise<SerialNumber> {
  return apiFetch<SerialNumber>(`/inventory/serial-numbers/${serialId}/`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteSerial(serialId: string): Promise<void> {
  await apiFetch<void>(`/inventory/serial-numbers/${serialId}/`, {
    method: "DELETE",
  });
}