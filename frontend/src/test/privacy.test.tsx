import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth } from "./testUtils";
import { Privacy } from "../pages/Privacy";

describe("01. PUBLIC WEBSITE -> Privacy Page V1", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the public Privacy page with brand identity for unauthenticated users", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/privacy"]}>
        <AuthProvider>
          <Routes>
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("privacy-page")).toBeInTheDocument();
    });

    expect(screen.getByTestId("privacy-brand")).toHaveTextContent("KOPERA");
    expect(screen.getByTestId("privacy-hero-title")).toBeInTheDocument();
  });

  it("contains privacy policy content", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/privacy"]}>
        <AuthProvider>
          <Routes>
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("privacy-page")).toBeInTheDocument();
    });

    expect(screen.getByText(/kebijakan privasi kopera os/i)).toBeInTheDocument();
  });

  it("provides valid CTAs pointing to register and login routes", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/privacy"]}>
        <AuthProvider>
          <Routes>
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/" element={<div data-testid="landing-home">Home</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("privacy-page")).toBeInTheDocument();
    });

    const registerLinks = screen.getAllByRole("link", { name: /daftar|mulai|register/i });
    expect(registerLinks.length).toBeGreaterThan(0);
    expect(registerLinks[0]).toHaveAttribute("href", "/register");
  });

  it("does not expose private tenant or business data", async () => {
    await bootAuth(false);

    const { container } = render(
      <MemoryRouter initialEntries={["/privacy"]}>
        <AuthProvider>
          <Routes>
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("privacy-page")).toBeInTheDocument();
    });

    expect(container.innerHTML).not.toContain("tenant_id");
    expect(container.innerHTML).not.toContain("access_token");
  });
});
