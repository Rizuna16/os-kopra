import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { BusinessProbe } from "./testUtils";
import type { BusinessSummary, LocationSummary } from "../business/types";

function wrap(node: ReactNode) {
  return (
    <MemoryRouter>
      <BusinessProvider>{node}</BusinessProvider>
    </MemoryRouter>
  );
}

describe("BusinessContext — state contract", () => {
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
  const loc: LocationSummary = { id: "l1", name: "Toko Utama" };

  it("starts with empty business state", async () => {
    render(wrap(<BusinessProbe />));
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId("biz-probe").textContent || "{}")).toEqual(
        expect.objectContaining({
          businesses: [],
          currentBusinessId: null,
          currentLocationId: null,
          currentBusiness: null,
          locations: [],
          currentLocation: null,
          isOnboardingComplete: false,
          subscriptionCreated: false,
        }),
      ),
    );
  });

  it("addBusiness adds a business to the list", async () => {
    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">
          {b.businesses.map((x) => x.id).join(",")}
          <button onClick={() => b.addBusiness(biz)}>add</button>
        </div>
      );
    }
    render(wrap(<Harness />));
    await waitFor(() => expect(screen.getByTestId("h")).toBeTruthy());
    screen.getByText("add").click();
    await waitFor(() => expect(screen.getByTestId("h").textContent).toContain("b1"));
  });

  it("first added business becomes the current business", async () => {
    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">
          {b.currentBusinessId ?? "none"}
          <button onClick={() => b.addBusiness(biz)}>add</button>
        </div>
      );
    }
    render(wrap(<Harness />));
    await waitFor(() => expect(screen.getByTestId("h")).toBeTruthy());
    screen.getByText("add").click();
    await waitFor(() =>
      expect(screen.getByTestId("h").textContent).toContain("b1"),
    );
  });

  it("currentBusiness resolves from currentBusinessId", async () => {
    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">
          {b.currentBusiness?.id ?? "none"}
          <button onClick={() => b.addBusiness(biz)}>add</button>
        </div>
      );
    }
    render(wrap(<Harness />));
    await waitFor(() => expect(screen.getByTestId("h")).toBeTruthy());
    screen.getByText("add").click();
    await waitFor(() =>
      expect(screen.getByTestId("h").textContent).toContain("b1"),
    );
  });

  it("current location can be selected", async () => {
    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">
          {b.currentLocationId ?? "none"}
          <button onClick={() => b.selectLocation(loc.id)}>sel</button>
        </div>
      );
    }
    render(wrap(<Harness />));
    await waitFor(() => expect(screen.getByTestId("h")).toBeTruthy());
    screen.getByText("sel").click();
    await waitFor(() =>
      expect(screen.getByTestId("h").textContent).toContain("l1"),
    );
  });

  it("currentLocation resolves from currentLocationId", async () => {
    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">
          {b.currentLocation?.id ?? "none"}
          <button onClick={() => b.selectLocation(loc.id)}>sel</button>
        </div>
      );
    }
    render(wrap(<Harness />));
    await waitFor(() => expect(screen.getByTestId("h")).toBeTruthy());
    screen.getByText("sel").click();
    await waitFor(() =>
      expect(screen.getByTestId("h").textContent).toContain("l1"),
    );
  });

  it("switching business triggers a location refresh", async () => {
    const biz2: BusinessSummary = { ...biz, id: "b2", name: "Toko Dua" };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/businesses/b2/locations/")) {
        return new Response(
          JSON.stringify([]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">
          {b.businesses.map((x) => x.id).join(",")}|
          {b.currentBusinessId ?? "none"}
          <button onClick={() => b.addBusiness(biz)}>add1</button>
          <button onClick={() => b.selectBusiness("b2")}>sel2</button>
          <button onClick={() => b.addBusiness(biz2)}>add2</button>
        </div>
      );
    }
    render(wrap(<Harness />));
    await waitFor(() => expect(screen.getByTestId("h")).toBeTruthy());
    screen.getByText("add1").click();
    await waitFor(() => expect(screen.getByTestId("h").textContent).toContain("b1"));
    screen.getByText("add2").click();
    await waitFor(() =>
      expect(screen.getByTestId("h").textContent).toContain("b1,b2"),
    );
    screen.getByText("sel2").click();
    await waitFor(() => expect(screen.getByTestId("h").textContent).toContain("|b2"));
    await waitFor(() => {
      const calledForB2 = fetchMock.mock.calls.some((c) => String(c[0]).includes("/businesses/b2/locations/"));
      expect(calledForB2).toBe(true);
    });
  });

  it("location belongs to the selected business", async () => {
    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">
          {b.currentBusinessId ?? "none"}:{b.locations.map((l) => l.id).join("|")}
          <button onClick={() => b.addBusiness(biz)}>add</button>
        </div>
      );
    }
    render(wrap(<Harness />));
    await waitFor(() => expect(screen.getByTestId("h")).toBeTruthy());
    screen.getByText("add").click();
    await waitFor(() => expect(screen.getByTestId("h").textContent).toContain("b1"));
  });

  it("invalid business selection is rejected/handled safely", async () => {
    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">
          {b.currentBusinessId ?? "none"}
          <button onClick={() => b.selectBusiness("does-not-exist")}>sel</button>
        </div>
      );
    }
    render(wrap(<Harness />));
    await waitFor(() => expect(screen.getByTestId("h")).toBeTruthy());
    expect(() => screen.getByText("sel").click()).not.toThrow();
    await waitFor(() =>
      expect(screen.getByTestId("h").textContent).not.toContain("does-not-exist"),
    );
  });

  it("invalid location selection is rejected/handled safely", async () => {
    function Harness() {
      const b = useBusiness();
      return (
        <div data-testid="h">
          {b.currentLocationId ?? "none"}
          <button onClick={() => b.selectLocation("nope")}>sel</button>
        </div>
      );
    }
    render(wrap(<Harness />));
    await waitFor(() => expect(screen.getByTestId("h")).toBeTruthy());
    expect(() => screen.getByText("sel").click()).not.toThrow();
    await waitFor(() =>
      expect(screen.getByTestId("h").textContent).not.toContain("nope"),
    );
  });

  it("malformed localStorage does not crash the provider", async () => {
    localStorage.setItem("kopera_businesses", "not-json");
    localStorage.setItem("kopera_current_business", ":::");
    expect(() => render(wrap(<BusinessProbe />))).not.toThrow();
  });

  it("missing localStorage values fall back safely", async () => {
    expect(() => render(wrap(<BusinessProbe />))).not.toThrow();
    await waitFor(() =>
      expect(screen.getByTestId("biz-probe").textContent).toContain("null"),
    );
  });
});
