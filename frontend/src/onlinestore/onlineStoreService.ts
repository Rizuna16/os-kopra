import { apiFetch } from "../lib/apiClient";
import type {
  OnlineStoreDetail,
  OnlineStoreProductDetail,
  OnlineOrderDetail,
} from "./types";

export async function listOnlineStores(businessId: string): Promise<OnlineStoreDetail[]> {
  return apiFetch<OnlineStoreDetail[]>(`/businesses/${businessId}/online-stores/`);
}

export async function createOnlineStore(
  businessId: string,
  payload: { name: string; slug: string; default_location: string }
): Promise<OnlineStoreDetail> {
  return apiFetch<OnlineStoreDetail>(`/businesses/${businessId}/online-stores/`, {
    method: "POST",
    body: payload,
  });
}

export async function getOnlineStore(
  businessId: string,
  storeId: string
): Promise<OnlineStoreDetail> {
  return apiFetch<OnlineStoreDetail>(`/businesses/${businessId}/online-stores/${storeId}/`);
}

export async function updateOnlineStore(
  businessId: string,
  storeId: string,
  payload: Partial<{ name: string; slug: string; default_location: string; is_active: boolean }>
): Promise<OnlineStoreDetail> {
  return apiFetch<OnlineStoreDetail>(`/businesses/${businessId}/online-stores/${storeId}/`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteOnlineStore(
  businessId: string,
  storeId: string
): Promise<void> {
  await apiFetch<void>(`/businesses/${businessId}/online-stores/${storeId}/`, {
    method: "DELETE",
  });
}

export async function listOnlineStoreProducts(
  businessId: string,
  storeId: string
): Promise<OnlineStoreProductDetail[]> {
  return apiFetch<OnlineStoreProductDetail[]>(`/businesses/${businessId}/online-stores/${storeId}/products/`);
}

export async function publishProductToOnlineStore(
  businessId: string,
  storeId: string,
  payload: { product: string; is_published: boolean }
): Promise<OnlineStoreProductDetail> {
  return apiFetch<OnlineStoreProductDetail>(`/businesses/${businessId}/online-stores/${storeId}/products/`, {
    method: "POST",
    body: payload,
  });
}

export async function updateProductPublishingStatus(
  businessId: string,
  storeId: string,
  productId: string,
  payload: { is_published: boolean }
): Promise<OnlineStoreProductDetail> {
  return apiFetch<OnlineStoreProductDetail>(`/businesses/${businessId}/online-stores/${storeId}/products/${productId}/`, {
    method: "PATCH",
    body: payload,
  });
}

export async function listOnlineOrders(
  slug: string
): Promise<OnlineOrderDetail[]> {
  return apiFetch<OnlineOrderDetail[]>(`/stores/${slug}/orders/`);
}