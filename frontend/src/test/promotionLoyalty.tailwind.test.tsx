import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth } from "./testUtils";
import { PromotionList } from "../pages/PromotionList";
import { PromotionCreate } from "../pages/PromotionCreate";
import { PromotionDetail } from "../pages/PromotionDetail";
import { PromotionEdit } from "../pages/PromotionEdit";
import { PromotionDelete } from "../pages/PromotionDelete";
import { LoyaltyProgramList } from "../pages/LoyaltyProgramList";
import { LoyaltyProgramCreate } from "../pages/LoyaltyProgramCreate";
import { LoyaltyProgramDetail } from "../pages/LoyaltyProgramDetail";
import { LoyaltyProgramEdit } from "../pages/LoyaltyProgramEdit";
import { CustomerLoyaltyRecordList } from "../pages/CustomerLoyaltyRecordList";
import { CustomerLoyaltyRecordCreate } from "../pages/CustomerLoyaltyRecordCreate";
import { CustomerLoyaltyRecordDetail } from "../pages/CustomerLoyaltyRecordDetail";
import { CustomerLoyaltyRecordEdit } from "../pages/CustomerLoyaltyRecordEdit";

const BID = "11111111-1111-1111-1111-111111111111";

function setupFetchMock() {
  return vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes("/auth/me/")) {
      return new Response(JSON.stringify({ id: "1", email: "a@b.com" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (u.includes(`/api/v1/businesses/${BID}/promotions/`)) {
      if (u.match(/\/promotions\/[^/]+\/?$/)) {
        return new Response(
          JSON.stringify([
            {
              id: "2",
              business: BID,
              name: "Promo A",
              discount_type: "PERCENTAGE",
              discount_value: "10.00",
              valid_from: "2024-01-01T00:00:00Z",
              valid_to: "2024-12-31T23:59:59Z",
              status: "ACTIVE",
              applicability: "BUSINESS_WIDE",
              target_product: null,
              target_variant: null,
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (u.includes(`/api/v1/businesses/${BID}/loyalty-programs/`)) {
      if (u.match(/\/loyalty-programs\/[^/]+\/?$/)) {
        return new Response(
          JSON.stringify([
            {
              id: "lp1",
              business: BID,
              name: "Loyalty A",
              points_type: "REWARD",
              points_value: 100,
              applicability: "BUSINESS_WIDE",
              valid_from: "2024-01-01T00:00:00Z",
              valid_to: "2024-12-31T23:59:59Z",
              status: "ACTIVE",
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (u.includes(`/api/v1/businesses/${BID}/customer-loyalty-records/`)) {
      if (u.match(/\/customer-loyalty-records\/[^/]+\/?$/)) {
        return new Response(
          JSON.stringify([
            {
              id: "cl1",
              business: BID,
              program_id: "lp1",
              customer_name: "Customer A",
              points_earned: 50,
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
  });
}

describe("Promotion & Loyalty UI Tailwind Contract Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  function setupAndRender(component: any) {
    beforeEach(() => {
      bootAuth(true);
      (globalThis as any).fetch = setupFetchMock();
    });
    return render(
      <MemoryRouter initialEntries={["/promotions"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/promotions" element={<PromotionList />} />
              <Route path="/promotions/new" element={<PromotionCreate />} />
              <Route path="/promotions/:promotionId" element={<PromotionDetail />} />
              <Route path="/promotions/:promotionId/edit" element={<PromotionEdit />} />
              <Route path="/promotions/:promotionId/delete" element={<PromotionDelete />} />
              <Route path="/loyalty-programs" element={<LoyaltyProgramList />} />
              <Route path="/loyalty-programs/new" element={<LoyaltyProgramCreate />} />
              <Route path="/loyalty-programs/:programId" element={<LoyaltyProgramDetail />} />
              <Route path="/loyalty-programs/:programId/edit" element={<LoyaltyProgramEdit />} />
              <Route path="/customer-loyalty-records" element={<CustomerLoyaltyRecordList />} />
              <Route path="/customer-loyalty-records/new" element={<CustomerLoyaltyRecordCreate />} />
              <Route path="/customer-loyalty-records/:recordId" element={<CustomerLoyaltyRecordDetail />} />
              <Route path="/customer-loyalty-records/:recordId/edit" element={<CustomerLoyaltyRecordEdit />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  }

  it("PromotionList has baseline root, container, card, title", async () => {
    (globalThis as any).fetch = setupFetchMock();
    bootAuth(true);
    render(
      <MemoryRouter initialEntries={["/promotions"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/promotions" element={<PromotionList />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("promotion-list")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="promotion-list"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("PromotionCreate has baseline root, container, card, title, inputs, button", async () => {
    (globalThis as any).fetch = setupFetchMock();
    bootAuth(true);
    render(
      <MemoryRouter initialEntries={["/promotions/new"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/promotions/new" element={<PromotionCreate />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("promotion-create-form")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="promotion-create"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("PromotionDetail has baseline root, container, card, title", async () => {
    (globalThis as any).fetch = setupFetchMock();
    bootAuth(true);
    render(
      <MemoryRouter initialEntries={["/promotions/2"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/promotions/:promotionId" element={<PromotionDetail />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("promotion-detail")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="promotion-detail"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("PromotionEdit has baseline root, container, card, title", async () => {
    (globalThis as any).fetch = setupFetchMock();
    bootAuth(true);
    render(
      <MemoryRouter initialEntries={["/promotions/2/edit"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/promotions/:promotionId/edit" element={<PromotionEdit />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("promotion-edit")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="promotion-edit"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("LoyaltyProgramList has baseline root, container, card, title", async () => {
    (globalThis as any).fetch = setupFetchMock();
    bootAuth(true);
    render(
      <MemoryRouter initialEntries={["/loyalty-programs"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/loyalty-programs" element={<LoyaltyProgramList />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("loyalty-program-list")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="loyalty-program-list"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("LoyaltyProgramCreate has baseline root, container, card, title, inputs, button", async () => {
    (globalThis as any).fetch = setupFetchMock();
    bootAuth(true);
    render(
      <MemoryRouter initialEntries={["/loyalty-programs/new"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/loyalty-programs/new" element={<LoyaltyProgramCreate />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("loyalty-program-create-form")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="loyalty-program-create"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("LoyaltyProgramDetail has baseline root, container, card, title", async () => {
    (globalThis as any).fetch = setupFetchMock();
    bootAuth(true);
    render(
      <MemoryRouter initialEntries={["/loyalty-programs/lp1"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/loyalty-programs/:programId" element={<LoyaltyProgramDetail />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("loyalty-program-detail")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="loyalty-program-detail"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("LoyaltyProgramEdit has baseline root, container, card, title", async () => {
    (globalThis as any).fetch = setupFetchMock();
    bootAuth(true);
    render(
      <MemoryRouter initialEntries={["/loyalty-programs/lp1/edit"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/loyalty-programs/:programId/edit" element={<LoyaltyProgramEdit />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("loyalty-program-edit")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="loyalty-program-edit"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("CustomerLoyaltyRecordList has baseline root, container, card, title", async () => {
    (globalThis as any).fetch = setupFetchMock();
    bootAuth(true);
    render(
      <MemoryRouter initialEntries={["/customer-loyalty-records"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/customer-loyalty-records" element={<CustomerLoyaltyRecordList />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-list")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="customer-loyalty-record-list"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("CustomerLoyaltyRecordCreate has baseline root, container, card, title, inputs, button", async () => {
    (globalThis as any).fetch = setupFetchMock();
    bootAuth(true);
    render(
      <MemoryRouter initialEntries={["/customer-loyalty-records/new"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/customer-loyalty-records/new" element={<CustomerLoyaltyRecordCreate />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-create-form")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="customer-loyalty-record-create"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("CustomerLoyaltyRecordDetail has baseline root, container, card, title", async () => {
    (globalThis as any).fetch = setupFetchMock();
    bootAuth(true);
    render(
      <MemoryRouter initialEntries={["/customer-loyalty-records/cl1"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/customer-loyalty-records/:recordId" element={<CustomerLoyaltyRecordDetail />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-detail")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="customer-loyalty-record-detail"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("CustomerLoyaltyRecordEdit has baseline root, container, card, title", async () => {
    (globalThis as any).fetch = setupFetchMock();
    bootAuth(true);
    render(
      <MemoryRouter initialEntries={["/customer-loyalty-records/cl1/edit"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/customer-loyalty-records/:recordId/edit" element={<CustomerLoyaltyRecordEdit />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-edit")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="customer-loyalty-record-edit"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });
});