import { apiFetch } from "../lib/apiClient";
import type { Variant, VariantPayload } from "./variantTypes";

export type { Variant, VariantPayload };

export async function listVariants(
  businessId: string,
  productId: string,
): Promise<Variant[]> {
  return apiFetch<Variant[]>(
    `/businesses/${businessId}/products/${productId}/variants/`,
  );
}

export async function createVariant(
  businessId: string,
  productId: string,
  payload: VariantPayload,
): Promise<Variant> {
  return apiFetch<Variant>(
    `/businesses/${businessId}/products/${productId}/variants/`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function getVariant(
  businessId: string,
  productId: string,
  variantId: string,
): Promise<Variant> {
  return apiFetch<Variant>(
    `/businesses/${businessId}/products/${productId}/variants/${variantId}/`,
  );
}

export async function updateVariant(
  businessId: string,
  productId: string,
  variantId: string,
  payload: VariantPayload,
): Promise<Variant> {
  return apiFetch<Variant>(
    `/businesses/${businessId}/products/${productId}/variants/${variantId}/`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export async function deleteVariant(
  businessId: string,
  productId: string,
  variantId: string,
): Promise<void> {
  await apiFetch<void>(
    `/businesses/${businessId}/products/${productId}/variants/${variantId}/`,
    {
      method: "DELETE",
    },
  );
}
