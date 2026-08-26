import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { ReportsPurchasing } from "../pages/ReportsPurchasing";

const BID = "11111111-1111-1111-1111-111111111111";

function seedCurrentBusiness(businessId: string) {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
    ])
  );
  localStorage.setItem("kopera_current_business", businessId);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderPurchasing() {
  seedCurrentBusiness(BID);
  return render(
    <MemoryRouter initialEntries={["/reports/purchasing"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/reports/purchasing" element={<ReportsPurchasing />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

const mockPurchasing = { total: 5, confirmed: 4, cancelled: 0, draft: 1, cost: "800.00" };

describe("ReportsPurchasing Page", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders purchasing report metrics with all required testids", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/reports/purchasing/`)) {
        return new Response(JSON.stringify(mockPurchasing), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderPurchasing();

    await waitFor(() => expect(screen.getByTestId("reports-purchasing-page")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("purchasing-total")).toBeTruthy());

    expect(screen.getByTestId("purchasing-total").textContent).toBe("5");
    expect(screen.getByTestId("purchasing-confirmed").textContent).toBe("4");
    expect(screen.getByTestId("purchasing-cancelled").textContent).toBe("0");
    expect(screen.getByTestId("purchasing-draft").textContent).toBe("1");
    expect(screen.getByTestId("purchasing-cost").textContent).toBe("800.00");
  });

  it("handles error state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("Error", { status: 500 });
    });
    (globalThis as any).fetch = fetchMock;

    renderPurchasing();

    await waitFor(() => expect(screen.getByTestId("reports-purchasing-error")).toBeTruthy());
  });
});
