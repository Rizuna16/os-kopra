import { API_BASE_URL } from "./env";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "./tokenStore";
import { ApiError } from "../auth/types";

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

function urlOf(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith(API_BASE_URL)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL.replace(/\/$/, "")}${p}`;
}

function parseRetryAfter(res: Response): string | undefined {
  return res.headers.get("Retry-After") ?? undefined;
}

async function parseBody<T>(res: Response): Promise<T | null> {
  const ct = res.headers.get("Content-Type") ?? "";
  if (ct.includes("application/json")) {
    try {
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }
  return null;
}

function isTokenRefreshRequest(path: string): boolean {
  return path.includes("/auth/token/refresh");
}

let refreshing: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    const res = await fetch(urlOf("/auth/token/refresh/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) return false;

    const data = (await res.json()) as {
      access: string;
      refresh?: string;
    };
    setAccessToken(data.access);
    if (data.refresh) setRefreshToken(data.refresh);
    return true;
  } catch {
    return false;
  }
}

async function refreshOnce(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = performRefresh();
  const ok = await refreshing;
  refreshing = null;
  return ok;
}

function buildHeaders(body?: unknown, extra?: HeadersInit): Headers {
  const h = new Headers(extra);
  const access = getAccessToken();
  if (access) h.set("Authorization", `Bearer ${access}`);
  if (body !== undefined && body !== null && !h.has("Content-Type")) {
    h.set("Content-Type", "application/json");
  }
  return h;
}

interface RawOpts {
  method?: string;
  headers?: HeadersInit;
  body?: unknown;
}

async function buildApiError(
  res: Response,
  fallback: string,
): Promise<ApiError> {
  const retryAfter = parseRetryAfter(res);
  const json = await parseBody<{
    error?: boolean;
    message?: string;
    status_code?: number;
    errors?: Record<string, string[]>;
  }>(res);
  const message = json?.message ?? fallback;
  const errors = json?.errors;
  return new ApiError(message, res.status, errors, retryAfter);
}

export async function apiRequestRaw<T = unknown>(
  path: string,
  opts: RawOpts = {},
): Promise<T> {
  const { method = "GET", body, headers } = opts;
  const init: RequestInit = {
    method,
    headers: buildHeaders(body, headers),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  const res = await fetch(urlOf(path), init);

  if (!res.ok) {
    throw await buildApiError(res, `Request failed (${res.status})`);
  }

  if (res.status === 204) return null as unknown as T;

  const data = await parseBody<T>(res);
  return (data as T) ?? (null as unknown as T);
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: RawOpts = {},
): Promise<T> {
  if (isTokenRefreshRequest(path)) {
    return apiRequestRaw<T>(path, opts);
  }

  try {
    return await apiRequestRaw<T>(path, opts);
  } catch (e: unknown) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e;

    const refreshed = await refreshOnce();

    if (!refreshed) {
      clearTokens();
      if (onUnauthorized) onUnauthorized();
      throw e;
    }

    return apiRequestRaw<T>(path, opts);
  }
}
