import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  BUSINESSES_KEY,
  CURRENT_BUSINESS_KEY,
  CURRENT_LOCATION_KEY,
  loadBusinesses,
  saveBusinesses,
  loadCurrentBusinessId,
  saveCurrentBusinessId,
  loadCurrentLocationId,
  saveCurrentLocationId,
} from "../business/storage";
import type { BusinessSummary } from "../business/types";

describe("Business/localStorage persistence contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  const biz: BusinessSummary = {
    id: "b1",
    name: "Toko Contoh",
    status: "ONBOARDING",
    created_at: "2024-01-01T00:00:00Z",
  };

  it("businesses persist to localStorage under the locked key", () => {
    saveBusinesses([biz]);
    expect(localStorage.getItem(BUSINESSES_KEY)).not.toBeNull();
    expect(loadBusinesses()).toEqual([biz]);
  });

  it("currentBusinessId persists to localStorage", () => {
    saveCurrentBusinessId("b1");
    expect(localStorage.getItem(CURRENT_BUSINESS_KEY)).toBe("b1");
    expect(loadCurrentBusinessId()).toBe("b1");
  });

  it("currentLocationId persists to localStorage", () => {
    saveCurrentLocationId("l1");
    expect(localStorage.getItem(CURRENT_LOCATION_KEY)).toBe("l1");
    expect(loadCurrentLocationId()).toBe("l1");
  });

  it("context restores businesses after remount", () => {
    saveBusinesses([biz]);
    expect(loadBusinesses()).toEqual([biz]);
  });

  it("context restores current business after remount", () => {
    saveCurrentBusinessId("b1");
    expect(loadCurrentBusinessId()).toBe("b1");
  });

  it("context restores current location when valid", () => {
    saveCurrentLocationId("l1");
    expect(loadCurrentLocationId()).toBe("l1");
  });

  it("malformed localStorage does not crash loaders", () => {
    localStorage.setItem(BUSINESSES_KEY, "not-json");
    localStorage.setItem(CURRENT_BUSINESS_KEY, ":::");
    expect(() => loadBusinesses()).not.toThrow();
    expect(() => loadCurrentBusinessId()).not.toThrow();
  });

  it("missing localStorage values fall back safely", () => {
    expect(loadBusinesses()).toEqual([]);
    expect(loadCurrentBusinessId()).toBeNull();
    expect(loadCurrentLocationId()).toBeNull();
  });
});
