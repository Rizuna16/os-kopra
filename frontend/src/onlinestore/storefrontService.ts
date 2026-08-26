import { apiFetch } from "../lib/apiClient";
import type {
  OnlineStoreSummary,
  CartSummary,
  OnlineOrderDetail,
  CheckoutInput,
} from "./types";

export interface PublicProductVariant {
  id: string;
  name: string;
  available: number;
}

export interface PublicProduct {
  id: string;
  name: string;
  price: string;
  variants: PublicProductVariant[];
}

export async function getPublicStore(slug: string): Promise<OnlineStoreSummary> {
  return apiFetch<OnlineStoreSummary>(`/stores/${slug}/`);
}

export async function getPublicCatalog(slug: string): Promise<PublicProduct[]> {
  return apiFetch<PublicProduct[]>(`/stores/${slug}/products/`);
}

export async function getCart(slug: string, sessionToken: string): Promise<CartSummary> {
  return apiFetch<CartSummary>(`/stores/${slug}/cart/?session_token=${encodeURIComponent(sessionToken)}`);
}

export async function addCartItem(
  slug: string,
  payload: { session_token: string; variant: string; quantity: string }
): Promise<CartSummary> {
  return apiFetch<CartSummary>(`/stores/${slug}/cart/`, {
    method: "POST",
    body: payload,
  });
}

export async function checkout(
  slug: string,
  payload: CheckoutInput
): Promise<OnlineOrderDetail> {
  return apiFetch<OnlineOrderDetail>(`/stores/${slug}/checkout/`, {
    method: "POST",
    body: payload,
  });
}