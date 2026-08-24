import type { BusinessSummary } from "./types";

export const BUSINESSES_KEY = "kopera_businesses";
export const CURRENT_BUSINESS_KEY = "kopera_current_business";
export const CURRENT_LOCATION_KEY = "kopera_current_location";

export function loadBusinesses(): BusinessSummary[] {
  try {
    const raw = localStorage.getItem(BUSINESSES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as BusinessSummary[];
  } catch {
    return [];
  }
}

export function saveBusinesses(businesses: BusinessSummary[]): void {
  try {
    localStorage.setItem(BUSINESSES_KEY, JSON.stringify(businesses));
  } catch {
    /* storage unavailable: ignore */
  }
}

export function loadCurrentBusinessId(): string | null {
  try {
    const raw = localStorage.getItem(CURRENT_BUSINESS_KEY);
    return raw ? raw : null;
  } catch {
    return null;
  }
}

export function saveCurrentBusinessId(id: string | null): void {
  try {
    if (id) localStorage.setItem(CURRENT_BUSINESS_KEY, id);
    else localStorage.removeItem(CURRENT_BUSINESS_KEY);
  } catch {
    /* storage unavailable: ignore */
  }
}

export function loadCurrentLocationId(): string | null {
  try {
    const raw = localStorage.getItem(CURRENT_LOCATION_KEY);
    return raw ? raw : null;
  } catch {
    return null;
  }
}

export function saveCurrentLocationId(id: string | null): void {
  try {
    if (id) localStorage.setItem(CURRENT_LOCATION_KEY, id);
    else localStorage.removeItem(CURRENT_LOCATION_KEY);
  } catch {
    /* storage unavailable: ignore */
  }
}

export function clearBusinessContext(): void {
  try {
    localStorage.removeItem(BUSINESSES_KEY);
    localStorage.removeItem(CURRENT_BUSINESS_KEY);
    localStorage.removeItem(CURRENT_LOCATION_KEY);
  } catch {
    /* storage unavailable: ignore */
  }
}
