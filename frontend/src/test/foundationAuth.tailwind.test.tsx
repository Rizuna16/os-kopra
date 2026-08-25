import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth, userObj } from "./testUtils";
import { Login } from "../pages/Login";
import { Register } from "../pages/Register";
import { VerifyEmail } from "../pages/VerifyEmail";
import { ForgotPassword } from "../pages/ForgotPassword";
import { ResetPassword } from "../pages/ResetPassword";

function renderAuth(node: ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

function setNativeValue(testid: string, value: string) {
  const input = screen.getByTestId(testid) as HTMLInputElement;
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;
  nativeSetter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("Login — Foundation Tailwind contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders with the locked Tailwind UI and preserves structure/behavior", async () => {
    await bootAuth(true);
    renderAuth(
      <AuthProvider>
        <Login />
      </AuthProvider>,
    );
    const root = await screen.findByTestId("login");
    // ROOT
    expect(root).toHaveClass(
      "min-h-screen",
      "flex",
      "items-center",
      "justify-center",
      "p-4",
    );
    // CARD/CONTAINER
    expect(root.querySelector(".max-w-md")).not.toBeNull();
    // FORM
    const form = root.querySelector("form") as HTMLElement;
    expect(form).toHaveClass("space-y-4");
    // HEADING
    expect(screen.getByRole("heading", { name: "Login" })).toHaveClass(
      "text-2xl",
      "font-bold",
    );
    // INPUTS
    expect(screen.getByTestId("email-input")).toHaveClass(
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
    expect(screen.getByTestId("password-input")).toHaveClass(
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
    // BUTTON
    const btn = screen.getByTestId("login-submit") as HTMLButtonElement;
    expect(btn).toHaveClass(
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
      "disabled:opacity-50",
      "disabled:cursor-not-allowed",
      "w-full",
    );
    expect(btn).toHaveAttribute("type", "submit");
    // LINKS
    const regLink = screen.getByRole("link", { name: "Register" });
    expect(regLink).toHaveAttribute("href", "/register");
    expect(regLink).toHaveClass("text-blue-600", "hover:underline");
    const forgotLink = screen.getByRole("link", { name: "Forgot password?" });
    expect(forgotLink).toHaveAttribute("href", "/forgot-password");
    expect(forgotLink).toHaveClass("text-blue-600", "hover:underline");
    // PRESERVED ATTRIBUTES
    expect(screen.getByTestId("email-input")).toHaveAttribute(
      "autocomplete",
      "username",
    );
    expect(screen.getByTestId("password-input")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByTestId("email-input")).toBeRequired();
    expect(screen.getByTestId("password-input")).toBeRequired();
  });

  it("preserves error rendering and applies error style", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(
      async (url: string) => {
        if (String(url).includes("/auth/me/")) {
          return new Response(JSON.stringify(userObj), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (String(url).includes("/auth/login/")) {
          return new Response(
            JSON.stringify({ message: "Invalid credentials" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("{}", { status: 200 });
      },
    );
    renderAuth(
      <AuthProvider>
        <Login />
      </AuthProvider>,
    );
    const form = screen.getByTestId("login").querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);
    const err = await screen.findByTestId("login-error");
    expect(err).toHaveAttribute("role", "alert");
    expect(err).toHaveClass("text-red-600");
  });
});

describe("Register — Foundation Tailwind contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders with locked Tailwind UI and preserves structure/behavior", async () => {
    await bootAuth(true);
    renderAuth(
      <AuthProvider>
        <Register />
      </AuthProvider>,
    );
    const root = await screen.findByTestId("register");
    expect(root).toHaveClass(
      "min-h-screen",
      "flex",
      "items-center",
      "justify-center",
      "p-4",
    );
    expect(root.querySelector(".max-w-md")).not.toBeNull();
    const form = root.querySelector("form") as HTMLElement;
    expect(form).toHaveClass("space-y-4");
    expect(screen.getByRole("heading", { name: "Register" })).toHaveClass(
      "text-2xl",
      "font-bold",
    );
    expect(screen.getByTestId("reg-email")).toHaveClass(
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
    expect(screen.getByTestId("reg-password")).toHaveClass(
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
    expect(screen.getByTestId("reg-confirm")).toHaveClass(
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
    const btn = screen.getByTestId("register-submit") as HTMLButtonElement;
    expect(btn).toHaveClass(
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
      "disabled:opacity-50",
      "disabled:cursor-not-allowed",
      "w-full",
    );
    expect(btn).toHaveAttribute("type", "submit");
    const link = screen.getByRole("link", { name: /login/i });
    expect(link).toHaveAttribute("href", "/login");
    expect(link).toHaveClass("text-blue-600", "hover:underline");
    expect(screen.getByTestId("reg-email")).toHaveAttribute(
      "autocomplete",
      "username",
    );
    expect(screen.getByTestId("reg-password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByTestId("reg-confirm")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByTestId("reg-email")).toBeRequired();
  });

  it("preserves client-side password mismatch validation", async () => {
    await bootAuth(true);
    renderAuth(
      <AuthProvider>
        <Register />
      </AuthProvider>,
    );
    await screen.findByTestId("register-submit");
    const form = screen.getByTestId("register").querySelector("form") as HTMLFormElement;
    setNativeValue("reg-password", "aaa");
    setNativeValue("reg-confirm", "bbb");
    fireEvent.submit(form);
    const err = await screen.findByTestId("register-error");
    expect(err).toHaveTextContent("Passwords do not match.");
  });
});

describe("VerifyEmail — Foundation Tailwind contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders with locked Tailwind UI and preserves aria-busy/token handling", async () => {
    renderAuth(<VerifyEmail />);
    const root = await screen.findByTestId("verify-email");
    expect(root).toHaveClass(
      "min-h-screen",
      "flex",
      "items-center",
      "justify-center",
      "p-4",
    );
    expect(root.querySelector(".max-w-md")).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: "Email Verification" }),
    ).toHaveClass("text-2xl", "font-bold");
    await waitFor(() =>
      expect(screen.getByText(/Missing verification token/)).toBeTruthy(),
    );
    expect(screen.getByText(/Missing verification token/)).toHaveAttribute(
      "aria-busy",
    );
    const link = screen.getByRole("link", { name: /login/i });
    expect(link).toHaveAttribute("href", "/login");
    expect(link).toHaveClass("text-blue-600", "hover:underline");
  });
});

describe("ForgotPassword — Foundation Tailwind contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders with locked Tailwind UI and preserves structure/behavior", async () => {
    renderAuth(<ForgotPassword />);
    const root = await screen.findByTestId("forgot-password");
    expect(root).toHaveClass(
      "min-h-screen",
      "flex",
      "items-center",
      "justify-center",
      "p-4",
    );
    expect(root.querySelector(".max-w-md")).not.toBeNull();
    const form = root.querySelector("form") as HTMLElement;
    expect(form).toHaveClass("space-y-4");
    expect(screen.getByRole("heading", { name: "Forgot Password" })).toHaveClass(
      "text-2xl",
      "font-bold",
    );
    expect(screen.getByTestId("forgot-email")).toHaveClass(
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
    const btn = screen.getByTestId("forgot-submit") as HTMLButtonElement;
    expect(btn).toHaveClass(
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
      "disabled:opacity-50",
      "disabled:cursor-not-allowed",
      "w-full",
    );
    expect(btn).toHaveAttribute("type", "submit");
    const link = screen.getByRole("link", { name: /login/i });
    expect(link).toHaveAttribute("href", "/login");
    expect(link).toHaveClass("text-blue-600", "hover:underline");
  });
});

describe("ResetPassword — Foundation Tailwind contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders with locked Tailwind UI and preserves structure/behavior", async () => {
    renderAuth(<ResetPassword />);
    const root = await screen.findByTestId("reset-password");
    expect(root).toHaveClass(
      "min-h-screen",
      "flex",
      "items-center",
      "justify-center",
      "p-4",
    );
    expect(root.querySelector(".max-w-md")).not.toBeNull();
    const form = root.querySelector("form") as HTMLElement;
    expect(form).toHaveClass("space-y-4");
    expect(screen.getByRole("heading", { name: "Reset Password" })).toHaveClass(
      "text-2xl",
      "font-bold",
    );
    expect(screen.getByTestId("new-password")).toHaveClass(
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
    expect(screen.getByTestId("confirm-password")).toHaveClass(
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
    expect(screen.getByTestId("new-password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByTestId("confirm-password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    const btn = screen.getByTestId("reset-submit") as HTMLButtonElement;
    expect(btn).toHaveClass(
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
      "disabled:opacity-50",
      "disabled:cursor-not-allowed",
      "w-full",
    );
    expect(btn).toHaveAttribute("type", "submit");
  });

  it("preserves client-side password mismatch validation", async () => {
    renderAuth(<ResetPassword />);
    await screen.findByTestId("reset-submit");
    const form = screen.getByTestId("reset-password").querySelector("form") as HTMLFormElement;
    setNativeValue("new-password", "aaa");
    setNativeValue("confirm-password", "bbb");
    fireEvent.submit(form);
    const err = await screen.findByTestId("reset-error");
    expect(err).toHaveTextContent("Passwords do not match.");
  });
});
