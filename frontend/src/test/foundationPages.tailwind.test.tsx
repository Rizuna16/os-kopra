import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppHome } from "../pages/AppHome";
import { Admin } from "../pages/Admin";
import { Forbidden } from "../pages/Forbidden";
import { NotFound } from "../pages/NotFound";

describe("AppHome — Foundation Tailwind contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });
  it("renders with locked Tailwind UI", () => {
    render(<MemoryRouter><AppHome /></MemoryRouter>);
    const root = screen.getByTestId("app-home");
    expect(root).toHaveClass("p-4");
    expect(screen.getByRole("heading", { name: "Dashboard" })).toHaveClass(
      "text-2xl",
      "font-bold",
    );
    expect(root).toHaveTextContent("Welcome to KOPERA OS");
  });
});

describe("Forbidden — Foundation Tailwind contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });
  it("renders with locked Tailwind UI and preserves role/text", () => {
    render(<MemoryRouter><Forbidden /></MemoryRouter>);
    const root = screen.getByTestId("forbidden");
    expect(root).toHaveAttribute("role", "alert");
    expect(root).toHaveClass("text-red-600");
    expect(screen.getByRole("heading", { name: "403 — Forbidden" })).toHaveClass(
      "text-2xl",
      "font-bold",
    );
    expect(root).toHaveTextContent("You do not have access to this page.");
  });
});

describe("NotFound — Foundation Tailwind contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });
  it("renders with locked Tailwind UI and preserves text", () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    const root = screen.getByTestId("notfound");
    expect(root).toHaveClass("p-4");
    expect(screen.getByRole("heading", { name: "404" })).toHaveClass(
      "text-2xl",
      "font-bold",
    );
    expect(root).toHaveTextContent("Page not found.");
  });
});

describe("Admin — Foundation Tailwind contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders admin surface with locked Tailwind UI and calls /admin/businesses/", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/admin/businesses/")) {
        return new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    render(<MemoryRouter><Admin /></MemoryRouter>);
    const root = await screen.findByTestId("admin");
    expect(root).toHaveClass("p-4");
    expect(screen.getByRole("heading", { name: "Admin KOPERA" })).toHaveClass(
      "text-2xl",
      "font-bold",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/businesses/"),
      expect.any(Object),
    );
  });

  it("renders Forbidden on 403 (preserved behavior)", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/admin/businesses/")) {
        return new Response("{}", {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    render(<MemoryRouter><Admin /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("forbidden")).toBeTruthy());
  });
});