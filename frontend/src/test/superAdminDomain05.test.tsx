import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SuperAdminUsers } from "../pages/SuperAdminUsers";
import { SuperAdminUserDetail } from "../pages/SuperAdminUserDetail";
import { apiFetch } from "../lib/apiClient";

vi.mock("../lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

describe("Domain 05 Super Admin User Management Frontend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests GET /api/v1/admin/users/ and renders user identity + platform flags", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce([
      {
        id: "u-1",
        email: "budi@kopera.io",
        first_name: "Budi",
        last_name: "Santoso",
        is_active: true,
        is_staff: false,
        is_superuser: false,
      },
    ]);

    render(
      <MemoryRouter initialEntries={["/platform-admin/users"]}>
        <Routes>
          <Route path="/platform-admin/users" element={<SuperAdminUsers />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("status")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("budi@kopera.io")).toBeInTheDocument();
      expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    });

    expect(apiFetch).toHaveBeenCalledWith("/admin/users/");
  });

  it("renders user detail with memberships/businesses/employee info", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      id: "u-1",
      email: "budi@kopera.io",
      first_name: "Budi",
      last_name: "Santoso",
      is_active: true,
      is_staff: false,
      is_superuser: false,
      is_email_verified: true,
      created_at: "2024-01-01T00:00:00Z",
      accessible_businesses: [
        { id: "b-1", name: "Toko Makmur", status: "ACTIVE" },
      ],
      memberships: [
        { business_id: "b-1", role: "ADMIN" },
      ],
      employee_info: [
        { business_id: "b-1", name: "Budi Karyawan", code: "EMP01", active: true },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/platform-admin/users/u-1"]}>
        <Routes>
          <Route path="/platform-admin/users/:userId" element={<SuperAdminUserDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("status")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("budi@kopera.io")).toBeInTheDocument();
      expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
      expect(screen.getByText(/Business b-1/)).toBeInTheDocument();
      expect(screen.getByText(/Role: ADMIN/)).toBeInTheDocument();
    });

    expect(apiFetch).toHaveBeenCalledWith("/admin/users/u-1/");
  });

  it("handles forbidden access correctly", async () => {
    const { ApiError } = await import("../auth/types");
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError("Forbidden", 403));

    render(
      <MemoryRouter initialEntries={["/platform-admin/users"]}>
        <Routes>
          <Route path="/platform-admin/users" element={<SuperAdminUsers />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("forbidden")).toBeInTheDocument();
    });
  });
});
