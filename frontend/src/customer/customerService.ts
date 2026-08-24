import { apiFetch } from "../lib/apiClient";
import type { Customer, CustomerPayload, CustomerUpdatePayload } from "./types";

export type { Customer, CustomerPayload, CustomerUpdatePayload };

export async function listCustomers(businessId: string): Promise<Customer[]> {
  return apiFetch<Customer[]>(`/businesses/${businessId}/customers/`);
}

export async function getCustomer(
  businessId: string,
  customerId: string,
): Promise<Customer> {
  return apiFetch<Customer>(
    `/businesses/${businessId}/customers/${customerId}/`,
  );
}

export async function createCustomer(
  businessId: string,
  payload: CustomerPayload,
): Promise<Customer> {
  return apiFetch<Customer>(`/businesses/${businessId}/customers/`, {
    method: "POST",
    body: payload,
  });
}

export async function updateCustomer(
  businessId: string,
  customerId: string,
  payload: CustomerUpdatePayload,
): Promise<Customer> {
  return apiFetch<Customer>(
    `/businesses/${businessId}/customers/${customerId}/`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export async function deleteCustomer(
  businessId: string,
  customerId: string,
): Promise<void> {
  await apiFetch<void>(
    `/businesses/${businessId}/customers/${customerId}/`,
    {
      method: "DELETE",
    },
  );
}
