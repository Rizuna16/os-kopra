import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth } from "./testUtils";
import { Kontak } from "../pages/Kontak";

describe("01. PUBLIC WEBSITE -> Kontak Page V1", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the public Kontak page with brand identity for unauthenticated users", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/kontak"]}>
        <AuthProvider>
          <Routes>
            <Route path="/kontak" element={<Kontak />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("kontak-page")).toBeInTheDocument();
    });

    expect(screen.getByTestId("kontak-brand")).toHaveTextContent("KOPERA");
    expect(screen.getByTestId("kontak-hero-title")).toBeInTheDocument();
  });

  it("displays contact information or contact CTA", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/kontak"]}>
        <AuthProvider>
          <Routes>
            <Route path="/kontak" element={<Kontak />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("kontak-page")).toBeInTheDocument();
    });

    expect(screen.getByText(/hubungi tim kopera/i)).toBeInTheDocument();
  });

  it("provides valid CTAs pointing to register and login routes", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/kontak"]}>
        <AuthProvider>
          <Routes>
            <Route path="/kontak" element={<Kontak />} />
            <Route path="/" element={<div data-testid="landing-home">Home</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("kontak-page")).toBeInTheDocument();
    });

    const registerLinks = screen.getAllByRole("link", { name: /daftar|mulai|register/i });
    expect(registerLinks.length).toBeGreaterThan(0);
    expect(registerLinks[0]).toHaveAttribute("href", "/register");
  });

  it("does not expose private tenant or business data", async () => {
    await bootAuth(false);

    const { container } = render(
      <MemoryRouter initialEntries={["/kontak"]}>
        <AuthProvider>
          <Routes>
            <Route path="/kontak" element={<Kontak />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("kontak-page")).toBeInTheDocument();
    });

    expect(container.innerHTML).not.toContain("tenant_id");
    expect(container.innerHTML).not.toContain("access_token");
  });
});
