/**
 * GAP-04DASH-CASHFLOW — RED PHASE: Frontend Tests
 * Contract Source: GAP-04-CASHFLOW-CONTRACT-LOCK.md (Amendment #1)
 * Status: RED — Tests expected to FAIL (implementation not yet present)
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";

const BID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const LOC_A = "11111111-1111-1111-1111-111111111111";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", LOC_A);
}

describe("CASHFLOW PAGE — ReportsCashflow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    seedContext();
  });

  it("renders ReportsCashflow page component when implemented", async () => {
    await bootAuth(true);
    const mod = await import("../pages/ReportsCashflow");
    expect(mod.ReportsCashflow).toBeDefined();
  });
});
