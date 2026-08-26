import { apiFetch } from "../lib/apiClient";
import type { Notification, MarkReadResponse } from "./types";

export type { Notification, MarkReadResponse };

export async function listNotifications(businessId: string): Promise<Notification[]> {
  return apiFetch<Notification[]>(`/businesses/${businessId}/notifications/`);
}

export async function getNotification(
  businessId: string,
  notificationId: string,
): Promise<Notification> {
  return apiFetch<Notification>(`/businesses/${businessId}/notifications/${notificationId}/`);
}

export async function markNotificationRead(
  businessId: string,
  notificationId: string,
): Promise<MarkReadResponse> {
  return apiFetch<MarkReadResponse>(
    `/businesses/${businessId}/notifications/${notificationId}/read/`,
    {
      method: "PATCH",
      body: {},
    },
  );
}
