import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useState, useEffect } from "react";
import { MemoryRouter } from "react-router-dom";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { createBusiness } from "../business/businessService";
import type { BusinessSummary } from "../business/types";

const SERVER_BIZ: BusinessSummary = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Toko Contoh",
  status: "ONBOARDING",
  created_at: "2024-01-01T00:00:00Z",
};

function mockBusinessPost() {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).includes("/api/v1/businesses/") && !url.includes("locations")) {
      return new Response(JSON.stringify(SERVER_BIZ), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

describe("Business creation (onboarding)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("POSTs name and business_type and returns the server business", async () => {
    const fetchMock = mockBusinessPost();
    const result = await createBusiness("Toko Contoh", "Usaha Lainnya");
    expect(result.id).toBe(SERVER_BIZ.id);
    expect(result.status).toBe("ONBOARDING");
    const call = fetchMock.mock.calls[0];
    expect(String(call[0])).toContain("/api/v1/businesses/");
    expect((call[1] as RequestInit).method).toBe("POST");
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({
      name: "Toko Contoh",
      business_type: "Usaha Lainnya",
    });
  });

  it("adds the created business into BusinessContext as current business", async () => {
    mockBusinessPost();
    function Harness() {
      const b = useBusiness();
      const [state, setState] = useState("init");
      useEffect(() => {
        (async () => {
          const created = await createBusiness("Toko Contoh", "Usaha Lainnya");
          b.addBusiness(created);
          setState("done");
        })();
      }, [b]);
      return (
        <div data-testid="h">
          {state}:{b.currentBusinessId ?? "none"}:
          {b.businesses.map((x) => x.id).join(",")}
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
    await waitFor(() =>
      expect(screen.getByTestId("h").textContent).toContain(
        "11111111-1111-1111-1111-111111111111",
      ),
    );
  });

  it("uses the server-returned UUID and never a client-generated id", async () => {
    mockBusinessPost();
    const result = await createBusiness("Toko Contoh", "Usaha Lainnya");
    expect(result.id).toBe("11111111-1111-1111-1111-111111111111");
  });
});
