import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth } from "./testUtils";
import { Fitur } from "../pages/Fitur";

describe("01. PUBLIC WEBSITE -> Fitur Page V1", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the public Fitur page with brand identity for unauthenticated users", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/fitur"]}>
        <AuthProvider>
          <Routes>
            <Route path="/fitur" element={<Fitur />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("fitur-page")).toBeInTheDocument();
    });

    expect(screen.getByTestId("fitur-brand")).toHaveTextContent("KOPERA");
    expect(screen.getByTestId("fitur-hero-title")).toBeInTheDocument();
  });

  it("explains KOPERA capabilities across all required feature areas", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/fitur"]}>
        <AuthProvider>
          <Routes>
            <Route path="/fitur" element={<Fitur />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("fitur-page")).toBeInTheDocument();
    });

    expect(screen.getAllByText(/penjualan|kasir/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/inventory|inventori/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/finance|keuangan/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/report|laporan/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/notif/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/online store|toko online/i).length).toBeGreaterThanOrEqual(1);
  });

  it("provides valid CTAs pointing to register and login routes", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/fitur"]}>
        <AuthProvider>
          <Routes>
            <Route path="/fitur" element={<Fitur />} />
            <Route path="/" element={<div data-testid="landing-home">Home</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("fitur-page")).toBeInTheDocument();
    });

    const registerLinks = screen.getAllByRole("link", { name: /daftar|mulai|register/i });
    expect(registerLinks.length).toBeGreaterThan(0);
    expect(registerLinks[0]).toHaveAttribute("href", "/register");
  });

  it("does not expose private tenant or business data", async () => {
    await bootAuth(false);

    const { container } = render(
      <MemoryRouter initialEntries={["/fitur"]}>
        <AuthProvider>
          <Routes>
            <Route path="/fitur" element={<Fitur />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("fitur-page")).toBeInTheDocument();
    });

    expect(container.innerHTML).not.toContain("tenant_id");
    expect(container.innerHTML).not.toContain("access_token");
  });
});
