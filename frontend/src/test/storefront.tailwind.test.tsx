import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Storefront } from "../pages/Storefront";

describe("Storefront UI Normalization V1 — Tailwind Baseline", () => {
  it("renders with normalized page, container, and card Tailwind classes", () => {
    render(
      <MemoryRouter initialEntries={["/store/test-store"]}>
        <Routes>
          <Route path="/store/:slug" element={<Storefront />} />
        </Routes>
      </MemoryRouter>
    );

    const container = screen.getByTestId("storefront");
    expect(container).toBeTruthy();
    expect(container.className).toContain("min-h-screen");
    expect(container.className).toContain("bg-gray-50");

    const card = container.querySelector(".bg-white");
    expect(card).toBeTruthy();
    expect(card?.className).toContain("rounded-2xl");
    expect(card?.className).toContain("border");
    expect(card?.className).toContain("shadow-sm");

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeTruthy();
    expect(heading.className).toContain("text-2xl");
    expect(heading.className).toContain("font-bold");
    expect(heading.className).toContain("text-gray-900");
  });
});
