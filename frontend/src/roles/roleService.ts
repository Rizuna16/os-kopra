import { apiFetch } from "../lib/apiClient";
import type { Member, MemberCreateInput } from "./types";

export async function listMembers(businessId: string): Promise<Member[]> {
  return apiFetch<Member[]>(`/businesses/${businessId}/members/`);
}

export async function addMember(
  businessId: string,
  payload: MemberCreateInput,
): Promise<Member> {
  return apiFetch<Member>(`/businesses/${businessId}/members/`, {
    method: "POST",
    body: payload,
  });
}

export async function updateMemberRole(
  businessId: string,
  userId: string,
  role: "ADMIN" | "KASIR",
): Promise<Member> {
  return apiFetch<Member>(`/businesses/${businessId}/members/${userId}/`, {
    method: "PATCH",
    body: { role },
  });
}

export async function removeMember(
  businessId: string,
  userId: string,
): Promise<void> {
  await apiFetch<void>(`/businesses/${businessId}/members/${userId}/`, {
    method: "DELETE",
  });
}