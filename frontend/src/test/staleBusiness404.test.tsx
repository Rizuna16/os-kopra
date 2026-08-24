import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import type { BusinessSummary, LocationSummary } from "../business/types";

const BIZ_ID = "11111111-1111-1111-1111-111111111111";
const biz: BusinessSummary = {
  id: BIZ_ID,
  name: "Toko Contoh",
  status: "ONBOARDING",
  created_at: "2024-01-01T00:00:00Z",
};
const loc: LocationSummary = { id: "l1", name: "Toko Utama" };

describe("Stale business (404) handling", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("removes the stale business and clears current ids when locations 404", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes(`/api/v1/businesses/${BIZ_ID}/locations/`)) {
        return new Response(
          JSON.stringify({ error: true, message: "not found", status_code: 404 }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">
          <span data-testid="state">
            {b.businesses.length ? b.businesses.map((x) => x.id).join(",") : "none"}|
            {b.currentBusinessId ?? "none"}|
            {b.currentLocationId ?? "none"}
          </span>
          <button onClick={() => b.addBusiness(biz)}>add</button>
          <button onClick={() => b.selectBusiness(BIZ_ID)}>sel</button>
          <button onClick={() => b.selectLocation(loc.id)}>loc</button>
          <button onClick={() => void b.refreshLocations()}>refresh</button>
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
    screen.getByText("add").click();
    await waitFor(() =>
      expect(screen.getByTestId("state").textContent).toContain(BIZ_ID),
    );
    screen.getByText("sel").click();
    screen.getByText("loc").click();
    screen.getByText("refresh").click();
    await waitFor(() =>
      expect(screen.getByTestId("state").textContent).toBe("none|none|none"),
    );
  });

  it("does not retry the locations request indefinitely on 404", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes(`/api/v1/businesses/${BIZ_ID}/locations/`)) {
        return new Response(
          JSON.stringify({ error: true, message: "not found", status_code: 404 }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">
          <button onClick={() => void b.refreshLocations()}>refresh</button>
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
    screen.getByText("refresh").click();
    await new Promise((r) => setTimeout(r, 50));
    const calls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BIZ_ID}/locations/`),
    );
    expect(calls.length).toBeLessThanOrEqual(1);
  });

  it("does not crash on a 404 stale business", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes(`/api/v1/businesses/${BIZ_ID}/locations/`)) {
        return new Response(
          JSON.stringify({ error: true, message: "not found", status_code: 404 }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">
          <button onClick={() => void b.refreshLocations()}>refresh</button>
        </div>
      );
    }
    expect(() =>
      render(
        <MemoryRouter>
          <BusinessProvider>
            <Harness />
          </BusinessProvider>
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });
});
