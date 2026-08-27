import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth } from "./testUtils";
import { Tentang } from "../pages/Tentang";

describe("01. PUBLIC WEBSITE -> Tentang KOPERA Page V1", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the public Tentang page with brand identity and mission for unauthenticated users", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/tentang"]}>
        <AuthProvider>
          <Routes>
            <Route path="/tentang" element={<Tentang />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("tentang-page")).toBeInTheDocument();
    });

    expect(screen.getByTestId("tentang-brand")).toHaveTextContent("KOPERA");
    expect(screen.getByTestId("tentang-hero-title")).toHaveTextContent(/Tentang KOPERA OS/i);
    expect(screen.getByText(/Sistem Operasi Ritel & Koperasi Indonesia/i)).toBeInTheDocument();
  });

  it("explains KOPERA's mission, problem-solving, and target audience without unsupported claims", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/tentang"]}>
        <AuthProvider>
          <Routes>
            <Route path="/tentang" element={<Tentang />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("tentang-page")).toBeInTheDocument();
    });

    expect(screen.getByText(/Misi & Visi Operasional/i)).toBeInTheDocument();
    expect(screen.getByText(/Untuk Siapa KOPERA OS/i)).toBeInTheDocument();
    expect(screen.getByText(/Pemilik Toko Ritel/i)).toBeInTheDocument();
  });

  it("provides valid CTAs and navigation back to Home or Register", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/tentang"]}>
        <AuthProvider>
          <Routes>
            <Route path="/tentang" element={<Tentang />} />
            <Route path="/" element={<div data-testid="landing-home">Home</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("tentang-page")).toBeInTheDocument();
    });

    const registerLinks = screen.getAllByRole("link", { name: /daftar|mulai|register/i });
    expect(registerLinks.length).toBeGreaterThan(0);
    expect(registerLinks[0]).toHaveAttribute("href", "/register");
  });

  it("does not expose private tenant or business data", async () => {
    await bootAuth(false);

    const { container } = render(
      <MemoryRouter initialEntries={["/tentang"]}>
        <AuthProvider>
          <Routes>
            <Route path="/tentang" element={<Tentang />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("tentang-page")).toBeInTheDocument();
    });

    expect(container.innerHTML).not.toContain("tenant_id");
    expect(container.innerHTML).not.toContain("access_token");
  });
});
