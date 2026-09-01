import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth } from "./testUtils";
import { FAQ } from "../pages/FAQ";

describe("01. PUBLIC WEBSITE -> FAQ Page V1", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the public FAQ page with brand identity for unauthenticated users", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/faq"]}>
        <AuthProvider>
          <Routes>
            <Route path="/faq" element={<FAQ />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("faq-page")).toBeInTheDocument();
    });

    expect(screen.getByTestId("faq-brand")).toHaveTextContent("KOPERA");
    expect(screen.getByTestId("faq-hero-title")).toBeInTheDocument();
  });

  it("contains at least 5 FAQ entries about KOPERA OS", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/faq"]}>
        <AuthProvider>
          <Routes>
            <Route path="/faq" element={<FAQ />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("faq-page")).toBeInTheDocument();
    });

    expect(screen.getByText(/apa itu kopera os\?/i)).toBeInTheDocument();
    expect(screen.getByText(/siapa.*dapat menggunakan kopera/i)).toBeInTheDocument();
    expect(screen.getByText(/lebih dari satu usaha/i)).toBeInTheDocument();
    expect(screen.getAllByText(/banyak lokasi/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/cara mulai menggunakan kopera/i)).toBeInTheDocument();
  });

  it("provides valid CTAs pointing to register and login routes", async () => {
    await bootAuth(false);

    render(
      <MemoryRouter initialEntries={["/faq"]}>
        <AuthProvider>
          <Routes>
            <Route path="/faq" element={<FAQ />} />
            <Route path="/" element={<div data-testid="landing-home">Home</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("faq-page")).toBeInTheDocument();
    });

    const registerLinks = screen.getAllByRole("link", { name: /daftar|mulai|register/i });
    expect(registerLinks.length).toBeGreaterThan(0);
    expect(registerLinks[0]).toHaveAttribute("href", "/register");
  });

  it("does not expose private tenant or business data", async () => {
    await bootAuth(false);

    const { container } = render(
      <MemoryRouter initialEntries={["/faq"]}>
        <AuthProvider>
          <Routes>
            <Route path="/faq" element={<FAQ />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("faq-page")).toBeInTheDocument();
    });

    expect(container.innerHTML).not.toContain("tenant_id");
    expect(container.innerHTML).not.toContain("access_token");
  });
});
