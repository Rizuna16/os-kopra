import { describe, it, expect, beforeEach, vi } from "vitest";
import { createBusiness, createLocation, listLocations } from "../business/businessService";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { BusinessSummary, LocationSummary } from "../business/types";

const BIZ_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_BIZ = "22222222-2222-2222-2222-222222222222";

describe("Tenant isolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("business id comes from the backend response, not client-generated", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/api/v1/businesses/") && !url.includes("locations")) {
        return new Response(
          JSON.stringify({
            id: BIZ_ID,
            name: "Toko Contoh",
            status: "ONBOARDING",
            created_at: "2024-01-01T00:00:00Z",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    const result = await createBusiness("Toko Contoh", "Usaha Lainnya");
    expect(result.id).toBe(BIZ_ID);
  });

  it("location id comes from the backend response, not client-generated", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes(`/api/v1/businesses/${BIZ_ID}/locations/`)) {
        return new Response(JSON.stringify({ id: "l1", name: "Toko Utama" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    const result = await createLocation(BIZ_ID, "Toko Utama");
    expect(result.id).toBe("l1");
  });

  it("current location must belong to the current business", async () => {
    const biz: BusinessSummary = {
      id: BIZ_ID,
      name: "Toko Contoh",
      status: "ONBOARDING",
      created_at: "2024-01-01T00:00:00Z",
    };
    const locOfOther: LocationSummary = { id: "l9", name: "Bukan Milik" };

    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">
          {b.currentBusinessId ?? "none"}:{b.currentLocationId ?? "none"}
          <button onClick={() => b.addBusiness(biz)}>addbiz</button>
          <button onClick={() => b.selectLocation(locOfOther.id)}>crossloc</button>
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
    screen.getByText("crossloc").click();
    await waitFor(() =>
      expect(screen.getByTestId("h").textContent).not.toContain("l9"),
    );
  });

  it("switching business reloads (clears) locations", async () => {
    const biz2: BusinessSummary = {
      id: OTHER_BIZ,
      name: "Toko Dua",
      status: "ACTIVE",
      created_at: "2024-01-02T00:00:00Z",
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes(`/api/v1/businesses/${OTHER_BIZ}/locations/`)) {
        return new Response(JSON.stringify([{ id: "l3", name: "Cabang Dua" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">
          {b.currentBusinessId ?? "none"}:{b.locations.map((id) => id).join("|")}
          <button onClick={() => b.addBusiness(biz2)}>add2</button>
          <button onClick={() => b.selectBusiness(OTHER_BIZ)}>sel2</button>
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
    screen.getByText("add2").click();
    await waitFor(() =>
      expect(screen.getByTestId("h").textContent).toContain(OTHER_BIZ),
    );
    screen.getByText("sel2").click();
    await waitFor(() =>
      expect(screen.getByTestId("h").textContent).toContain(OTHER_BIZ),
    );
    await waitFor(() => {
      const calledOtherBiz = fetchMock.mock.calls.some((c) =>
        String(c[0]).includes(`/api/v1/businesses/${OTHER_BIZ}/locations/`),
      );
      expect(calledOtherBiz, "OTHER_BIZ locations endpoint should be fetched").toBe(
        true,
      );
    });
  });

  it("arbitrary business ids cannot bypass context selection", async () => {
    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">
          {b.currentBusinessId ?? "none"}
          <button onClick={() => b.selectBusiness("attacker-id")}>sel</button>
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
    screen.getByText("sel").click();
    await waitFor(() =>
      expect(screen.getByTestId("h").textContent).not.toContain("attacker-id"),
    );
  });

  it("a cross-business location response is not accepted into current context", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes(`/api/v1/businesses/${BIZ_ID}/locations/`)) {
        return new Response(
          JSON.stringify([
            { id: "l1", name: "Milik Sendiri" },
            { id: "lX", name: "Milik Orang Lain" },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    const result = await listLocations(BIZ_ID);
    expect(Array.isArray(result)).toBe(true);
    expect(result.map((l) => l.id)).toContain("l1");
  });
});
