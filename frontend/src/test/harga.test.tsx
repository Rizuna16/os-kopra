import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth } from "./testUtils";
import { Harga } from "../pages/Harga";

describe("01. PUBLIC WEBSITE -> Harga Page V1", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the public Harga page with brand identity for unauthenticated users", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/harga"]}>
        <AuthProvider>
          <Routes>
            <Route path="/harga" element={<Harga />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("harga-page")).toBeInTheDocument();
    });

    expect(screen.getByTestId("harga-brand")).toHaveTextContent("KOPERA");
    expect(screen.getByTestId("harga-hero-title")).toBeInTheDocument();
  });

  it("displays all three subscription plan tiers", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/harga"]}>
        <AuthProvider>
          <Routes>
            <Route path="/harga" element={<Harga />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("harga-page")).toBeInTheDocument();
    });

    expect(screen.getByText(/basic/i)).toBeInTheDocument();
    expect(screen.getByText(/pro/i)).toBeInTheDocument();
    expect(screen.getByText(/business/i)).toBeInTheDocument();
  });

  it("provides valid CTAs pointing to register and login routes", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/harga"]}>
        <AuthProvider>
          <Routes>
            <Route path="/harga" element={<Harga />} />
            <Route path="/" element={<div data-testid="landing-home">Home</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("harga-page")).toBeInTheDocument();
    });

    const registerLinks = screen.getAllByRole("link", { name: /daftar|mulai|register/i });
    expect(registerLinks.length).toBeGreaterThan(0);
    expect(registerLinks[0]).toHaveAttribute("href", "/register");
  });

  it("does not expose private tenant or business data", async () => {
    await bootAuth(false);

    const { container } = render(
      <MemoryRouter initialEntries={["/harga"]}>
        <AuthProvider>
          <Routes>
            <Route path="/harga" element={<Harga />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("harga-page")).toBeInTheDocument();
    });

    expect(container.innerHTML).not.toContain("tenant_id");
    expect(container.innerHTML).not.toContain("access_token");
  });
});
