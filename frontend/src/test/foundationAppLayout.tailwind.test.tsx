import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth } from "./testUtils";
import { AppLayout } from "../layouts/AppLayout";

function seed() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: "b1", name: "Toko Satu", status: "ONBOARDING", created_at: "2024-01-01T00:00:00Z" },
      { id: "b2", name: "Toko Dua", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
    ]),
  );
  localStorage.setItem("kopera_current_business", "b1");
}

async function renderLayout() {
  await bootAuth(true);
  seed();
  return render(
    <MemoryRouter>
      <AuthProvider>
        <BusinessProvider>
          <AppLayout>
            <div data-testid="app-body" />
          </AppLayout>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AppLayout — Foundation Tailwind contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("applies locked Tailwind utility classes to shell regions", async () => {
    const { container } = await renderLayout();
    await waitFor(() => expect(screen.getByTestId("business-selector")).toBeTruthy());
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass("min-h-screen", "flex", "flex-col");
    const header = container.querySelector("header") as HTMLElement;
    expect(header).toHaveClass(
      "flex",
      "items-center",
      "gap-4",
      "flex-wrap",
      "p-4",
      "bg-white",
      "border-b",
      "border-gray-100",
      "shadow-sm",
    );
    const brand = header.querySelector("span") as HTMLElement;
    expect(brand).toHaveClass("font-bold");
    const bizCtx = screen.getByTestId("business-selector").parentElement as HTMLElement;
    expect(bizCtx).toHaveClass("relative");
    const locCtx = screen.getByTestId("location-selector").parentElement as HTMLElement;
    expect(locCtx).toHaveClass("relative");
    const appUser = screen.getByTestId("logout-btn").parentElement as HTMLElement;
    expect(appUser).toHaveClass("flex", "items-center", "gap-2", "ml-auto");
    const main = container.querySelector("main") as HTMLElement;
    expect(main).toHaveClass("p-4", "flex-1");
  });

  it("preserves nav aria-label, children, selectors, logout and click behavior", async () => {
    const { container } = await renderLayout();
    await waitFor(() => expect(screen.getByTestId("business-selector")).toBeTruthy());
    expect(container.querySelector('nav[aria-label="Primary"]')).toBeTruthy();
    expect(screen.getByTestId("app-body")).toBeInTheDocument();
    expect(screen.getByTestId("user-email")).toBeInTheDocument();
    expect(screen.getByTestId("logout-btn")).toBeInTheDocument();
    // click behavior preserved
    screen.getByTestId("business-selector-option-b2").click();
    await waitFor(() =>
      expect(screen.getByTestId("business-selector").textContent).toContain("Toko Dua"),
    );
  });
});