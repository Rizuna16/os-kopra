import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppHome } from "../pages/AppHome";

describe("V1 Dashboard shell non-regression (AppHome.tsx)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the existing static V1 shell copy unchanged", () => {
    render(
      <MemoryRouter>
        <AppHome />
      </MemoryRouter>,
    );
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(
      screen.getByText("Welcome to KOPERA OS. Business modules load here."),
    ).toBeTruthy();
  });

  it("does NOT render Post-V1 dashboard KPIs (V1 must stay a static shell)", () => {
    render(
      <MemoryRouter>
        <AppHome />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("kpi-total-omzet")).not.toBeInTheDocument();
    expect(screen.queryByTestId("kpi-total-penjualan")).not.toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-loading")).not.toBeInTheDocument();
  });
});
