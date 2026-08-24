import { apiFetch } from "../lib/apiClient";

export interface Variant {
  id: string;
  product: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface ProductSummary {
  id: string;
}

/**
 * Isolated variant lookup for Inventory. Inventory needs Variant UUIDs but the
 * Product Module has no business-wide variant endpoint, so we aggregate by
 * fetching products for the active business and then variants per product.
 * This dependency is intentionally isolated so it can be replaced by a proper
 * Variant service without rewriting Inventory.
 */
export async function listVariantsForBusiness(
  businessId: string,
): Promise<Variant[]> {
  const products = await apiFetch<ProductSummary[]>(
    `/businesses/${businessId}/products/`,
  );
  const all: Variant[] = [];
  for (const p of products ?? []) {
    const variants = await apiFetch<Variant[]>(
      `/businesses/${businessId}/products/${p.id}/variants/`,
    );
    if (variants && variants.length) all.push(...variants);
  }
  return all;
}