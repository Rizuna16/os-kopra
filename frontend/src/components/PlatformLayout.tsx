import { useState, useEffect, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../lib/apiClient";
import { ApiError } from "../auth/types";
import { Forbidden } from "../pages/Forbidden";

const NAV_ITEMS = [
  { to: "/platform-admin/dashboard", label: "Dashboard" },
  { to: "/platform-admin/businesses", label: "Usaha Management" },
  { to: "/platform-admin/accounts", label: "Accounts" },
  { to: "/platform-admin/owners", label: "Owners" },
  { to: "/platform-admin/users", label: "Users" },
  { to: "/platform-admin/admins", label: "Admins" },
  { to: "/platform-admin/audit-logs", label: "Audit Logs" },
  { to: "/platform-admin/backups", label: "Backup & Restore" },
  { to: "/platform-admin/subscriptions", label: "Subscriptions" },
  { to: "/platform-admin/plans", label: "Plans" },
];

export function PlatformLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [authState, setAuthState] = useState<"checking" | "authorized" | "forbidden">("checking");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await apiFetch("/admin/monitoring/");
        if (active) setAuthState("authorized");
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          if (active) setAuthState("forbidden");
        } else if (active) {
          // Any other error or non-403 error is tolerated
          setAuthState("authorized");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (authState === "checking") {
    return <div role="status">Loading…</div>;
  }

  if (authState === "forbidden") {
    return <Forbidden />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center gap-4 flex-wrap p-4 bg-gray-900 text-white shadow-sm">
        <span className="text-xl font-bold tracking-tight">
          KOPERA PLATFORM / SUPER ADMIN
        </span>
        <nav aria-label="Platform Primary" className="flex items-center gap-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-2 text-sm rounded-xl transition-colors ${
                  isActive
                    ? "bg-white text-gray-900 font-medium"
                    : "text-gray-200 hover:bg-gray-800"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-300">{user?.email ?? ""}</span>
          <button
            type="button"
            onClick={() => void logout()}
            className="px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="p-4 sm:p-6 lg:p-8 flex-1">{children}</main>
    </div>
  );
}
