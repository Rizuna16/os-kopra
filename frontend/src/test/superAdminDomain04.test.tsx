import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SuperAdminBusinesses } from "../pages/SuperAdminBusinesses";
import { SuperAdminBusinessDetail } from "../pages/SuperAdminBusinessDetail";
import { apiFetch } from "../lib/apiClient";

vi.mock("../lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

describe("Domain 04 Super Admin Business Management Frontend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders business list successfully", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce([
      {
        id: "b-1",
        name: "Toko Sembako Berkah",
        status: "ACTIVE",
        owner_id: "owner-1",
        subscription_status: "ACTIVE",
      },
    ]);

    render(
      <MemoryRouter initialEntries={["/platform-admin/businesses"]}>
        <Routes>
          <Route path="/platform-admin/businesses" element={<SuperAdminBusinesses />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("status")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Toko Sembako Berkah")).toBeInTheDocument();
      expect(screen.getAllByText("ACTIVE").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("owner-1")).toBeInTheDocument();
    });

    expect(apiFetch).toHaveBeenCalledWith("/admin/businesses/");
  });

  it("renders business detail successfully", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      id: "b-1",
      name: "Toko Sembako Berkah",
      status: "ACTIVE",
      owner_id: "owner-1",
      subscription_status: "ACTIVE",
    });

    render(
      <MemoryRouter initialEntries={["/platform-admin/businesses/b-1"]}>
        <Routes>
          <Route path="/platform-admin/businesses/:businessId" element={<SuperAdminBusinessDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("status")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Detail Usaha")).toBeInTheDocument();
      expect(screen.getByText("Toko Sembako Berkah")).toBeInTheDocument();
      expect(screen.getByText("owner-1")).toBeInTheDocument();
    });

    expect(apiFetch).toHaveBeenCalledWith("/admin/businesses/b-1/");
  });

  it("handles forbidden access correctly", async () => {
    const { ApiError } = await import("../auth/types");
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError("Forbidden", 403));

    render(
      <MemoryRouter initialEntries={["/platform-admin/businesses"]}>
        <Routes>
          <Route path="/platform-admin/businesses" element={<SuperAdminBusinesses />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Akses Ditolak|Forbidden/i)).toBeInTheDocument();
    });
  });
});
