import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import type { BusinessSummary, LocationSummary } from "../business/types";

const biz: BusinessSummary = {
  id: "b1",
  name: "Toko Contoh",
  status: "ONBOARDING",
  created_at: "2024-01-01T00:00:00Z",
};
const loc: LocationSummary = { id: "l1", name: "Toko Utama" };

describe("Onboarding completion inference", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("isOnboardingComplete is true when business + location + subscriptionCreated all present", async () => {
    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">
          {String(b.isOnboardingComplete)}
          <button onClick={() => b.addBusiness(biz)}>addbiz</button>
          <button onClick={() => b.selectLocation(loc.id)}>addloc</button>
        </div>
      );
    }
    render(
      <MemoryRouter>
        <BusinessProvider>
          <Harness />
        </BusinessProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("h")).toBeTruthy());
    screen.getByText("addbiz").click();
    screen.getByText("addloc").click();
    await waitFor(() =>
      expect(screen.getByTestId("h").textContent).toContain("true"),
    );
  });

  it("isOnboardingComplete does NOT depend on a backend subscription read after reload", async () => {
    localStorage.setItem(
      "kopera_businesses",
      JSON.stringify([biz]),
    );
    localStorage.setItem("kopera_current_business", "b1");
    localStorage.setItem("kopera_current_location", "l1");
    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">{String(b.isOnboardingComplete)}</div>
      );
    }
    render(
      <MemoryRouter>
        <BusinessProvider>
          <Harness />
        </BusinessProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("h").textContent).toContain("true"),
    );
  });

  it("isOnboardingComplete is false when only a business exists", async () => {
    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">
          {String(b.isOnboardingComplete)}
          <button onClick={() => b.addBusiness(biz)}>addbiz</button>
        </div>
      );
    }
    render(
      <MemoryRouter>
        <BusinessProvider>
          <Harness />
        </BusinessProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("h")).toBeTruthy());
    screen.getByText("addbiz").click();
    await waitFor(() =>
      expect(screen.getByTestId("h").textContent).toContain("false"),
    );
  });
});
