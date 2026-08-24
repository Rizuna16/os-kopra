import { User, ApiError } from "../auth/types";
import { apiRequestRaw, apiFetch } from "../lib/apiClient";
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
} from "../lib/tokenStore";

export interface RegisterInput {
  email: string;
  first_name?: string;
  last_name?: string;
  password: string;
  password_confirm: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function register(data: RegisterInput): Promise<User> {
  const res = await apiRequestRaw<User>("/auth/register/", {
    method: "POST",
    body: data,
  });
  return res as User;
}

export async function login(data: LoginInput): Promise<User> {
  const res = await apiRequestRaw<{
    access: string;
    refresh: string;
    user: User;
  }>("/auth/login/", { method: "POST", body: data });

  if (!res) {
    throw new ApiError("Login failed unexpectedly", 0);
  }

  setAccessToken(res.access);
  setRefreshToken(res.refresh);
  return res.user;
}

export async function logout(): Promise<void> {
  const refresh = getRefreshToken();
  await apiRequestRaw("/auth/logout/", {
    method: "POST",
    body: { refresh },
  });
}

export async function logoutAll(): Promise<void> {
  await apiRequestRaw("/auth/logout-all/", { method: "POST" });
}

export async function me(): Promise<User> {
  return await apiFetch<User>("/auth/me/");
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  return await apiRequestRaw<{ message: string }>(
    "/auth/email/verify/",
    { method: "POST", body: { token } },
  );
}

export async function resendEmail(email: string): Promise<{ message: string }> {
  return await apiRequestRaw<{ message: string }>(
    "/auth/email/resend/",
    { method: "POST", body: { email } },
  );
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return await apiRequestRaw<{ message: string }>(
    "/auth/password/forgot/",
    { method: "POST", body: { email } },
  );
}

export async function resetPassword(
  token: string,
  password: string,
  password_confirm: string,
): Promise<{ message: string }> {
  return await apiRequestRaw<{ message: string }>(
    "/auth/password/reset/",
    { method: "POST", body: { token, password, password_confirm } },
  );
}

export async function changePassword(
  current_password: string,
  new_password: string,
  new_password_confirm: string,
  refresh?: string,
): Promise<{ message: string }> {
  return await apiRequestRaw<{ message: string }>(
    "/auth/password/change/",
    {
      method: "POST",
      body: {
        current_password,
        new_password,
        new_password_confirm,
        refresh,
      },
    },
  );
}