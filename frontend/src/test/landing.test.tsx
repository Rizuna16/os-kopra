import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth } from "./testUtils";
import { Landing } from "../pages/Landing";

describe("01. PUBLIC WEBSITE -> Landing Page V1", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the public Landing Page with branding and value proposition for unauthenticated users", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("landing-page")).toBeInTheDocument();
    });

    // Branding and key hero text
    expect(screen.getByTestId("landing-brand")).toHaveTextContent("KOPERA");
    expect(screen.getByTestId("landing-hero-title")).toHaveTextContent(/KOPERA OS/i);
    
    // Check navigation and CTA links
    const loginLinks = screen.getAllByRole("link", { name: /masuk|login/i });
    expect(loginLinks.length).toBeGreaterThan(0);
    expect(loginLinks[0]).toHaveAttribute("href", "/login");

    const registerLinks = screen.getAllByRole("link", { name: /daftar|mulai|register/i });
    expect(registerLinks.length).toBeGreaterThan(0);
    expect(registerLinks[0]).toHaveAttribute("href", "/register");
  });

  it("renders core feature highlights and value pillars of KOPERA OS", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("landing-page")).toBeInTheDocument();
    });

    expect(screen.getByTestId("features-section")).toBeInTheDocument();
    expect(screen.getAllByText(/Point of Sale/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Inventori & Stok/i)).toBeInTheDocument();
    expect(screen.getByText(/Keuangan & Pembukuan/i)).toBeInTheDocument();
  });

  it("renders CTA to dashboard when user is authenticated without breaking public landing access", async () => {
    await bootAuth(true);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("landing-page")).toBeInTheDocument();
    });

    const dashboardLinks = screen.getAllByRole("link", { name: /dashboard|buka dashboard/i });
    expect(dashboardLinks.length).toBeGreaterThan(0);
    expect(dashboardLinks[0]).toHaveAttribute("href", "/app");
  });

  it("does not expose private business data, internal IDs or secrets in the landing page", async () => {
    await bootAuth(false);

    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("landing-page")).toBeInTheDocument();
    });

    // Check no tenant-specific leaked tokens or IDs
    expect(container.innerHTML).not.toContain("tenant_id");
    expect(container.innerHTML).not.toContain("access_token");
    expect(container.innerHTML).not.toContain("SECRET_KEY");
  });
});
