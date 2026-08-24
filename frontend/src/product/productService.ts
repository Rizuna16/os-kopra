import { apiFetch } from "../lib/apiClient";
import type { Product } from "./types";

export interface ProductPayload {
  name: string;
  price?: number | string;
}

export async function listProducts(businessId: string): Promise<Product[]> {
  return apiFetch<Product[]>(`/businesses/${businessId}/products/`);
}

export async function getProduct(businessId: string, productId: string): Promise<Product> {
  return apiFetch<Product>(`/businesses/${businessId}/products/${productId}/`);
}

export async function createProduct(businessId: string, payload: ProductPayload): Promise<Product> {
  return apiFetch<Product>(`/businesses/${businessId}/products/`, {
    method: "POST",
    body: payload,
  });
}

export async function updateProduct(businessId: string, productId: string, payload: ProductPayload): Promise<Product> {
  return apiFetch<Product>(`/businesses/${businessId}/products/${productId}/`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteProduct(businessId: string, productId: string): Promise<void> {
  await apiFetch<void>(`/businesses/${businessId}/products/${productId}/`, {
    method: "DELETE",
  });
}
