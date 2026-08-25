import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Onboarding } from "../pages/Onboarding";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth } from "./testUtils";

describe("Onboarding — UI Normalization V1 contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("checks root, card, progress indicator, and input/button styling", async () => {
    await bootAuth(true);
    render(
      <MemoryRouter>
        <AuthProvider>
          <BusinessProvider>
            <Onboarding />
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    // 1. Root modern styling
    const root = await screen.findByTestId("onboarding");
    expect(root).toHaveClass(
      "min-h-screen",
      "bg-gray-50",
      "flex",
      "items-center",
      "justify-center",
      "p-4",
      "sm:p-6",
    );

    // 2. Card styling (w-full max-w-lg bg-white rounded-2xl border border-gray-100 shadow-xl p-6 sm:p-8)
    const card = root.firstElementChild;
    expect(card).not.toBeNull();
    expect(card).toHaveClass(
      "w-full",
      "max-w-lg",
      "bg-white",
      "rounded-2xl",
      "border",
      "border-gray-100",
      "shadow-xl",
      "p-6",
      "sm:p-8",
    );

    // 3. Progress indicator & 4. Active step (Step 1 active)
    // The step label spans contain exactly the step names
    const stepLabels = screen.getAllByText(/^(Business|Location|Subscription|Plans)$/);
    expect(stepLabels).toHaveLength(5); // 4 progress step labels + 1 visible step heading (Business)
    // The step label spans are the ones with text-xs sm:text-sm font-medium
    const businessLabel = screen.getByText("Business", { selector: "span" });
    const locationLabel = screen.getByText("Location", { selector: "span" });
    const subscriptionLabel = screen.getByText("Subscription", { selector: "span" });
    const plansLabel = screen.getByText("Plans", { selector: "span" });
    expect(businessLabel).toHaveClass("text-blue-600");
    expect(locationLabel).toHaveClass("text-gray-500");
    expect(subscriptionLabel).toHaveClass("text-gray-500");
    expect(plansLabel).toHaveClass("text-gray-500");
    // the active circle wrapper for step 1 has blue ring emphasis
    const activeCircle = screen.getByText("1").closest("div")!;
    expect(activeCircle).toHaveClass("bg-blue-600", "text-white", "ring-4", "ring-blue-100");

    // 7. Input styling
    const input = screen.getByTestId("business-name-input");
    expect(input).toHaveClass(
      "w-full",
      "px-4",
      "py-2.5",
      "text-sm",
      "rounded-xl",
      "border",
      "border-gray-300",
      "bg-white",
      "text-gray-900",
      "placeholder-gray-400",
      "focus:outline-none",
      "focus:ring-2",
      "focus:ring-blue-600",
      "focus:border-transparent",
      "transition-all",
    );

    // 8. Button styling
    const btn = screen.getByTestId("business-submit");
    expect(btn).toHaveClass(
      "w-full",
      "py-3",
      "px-4",
      "bg-blue-600",
      "hover:bg-blue-700",
      "font-medium",
      "text-sm",
      "text-white",
      "rounded-xl",
      "shadow-sm",
      "transition-colors",
      "focus:outline-none",
      "focus:ring-2",
      "focus:ring-blue-600",
      "focus:ring-offset-2",
    );
  });

  it("checks error styling", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "a@b.com" }), { status: 200 });
      }
      if (String(url).includes("/businesses/")) {
        return new Response(JSON.stringify({ message: "Invalid business name" }), { status: 400 });
      }
      return new Response("{}", { status: 200 });
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <BusinessProvider>
            <Onboarding />
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    const input = await screen.findByTestId("business-name-input");
    fireEvent.change(input, { target: { value: "Bad" } });
    const form = screen.getByTestId("business-submit").closest("form")!;
    fireEvent.submit(form);

    const err = await screen.findByTestId("onboarding-error");
    expect(err).toHaveAttribute("role", "alert");
    expect(err).toHaveClass(
      "text-sm",
      "text-red-600",
      "bg-red-50",
      "border",
      "border-red-100",
      "rounded-xl",
      "p-3",
      "sm:p-4",
    );
  });
});
