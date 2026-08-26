import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useBusiness } from "../business/BusinessContext";

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const {
    businesses,
    currentBusiness,
    locations,
    currentLocationId,
    currentLocation,
    selectBusiness,
    selectLocation,
  } = useBusiness();

  // If on Owner Dashboard, let OwnerDashboard render its complete command center shell (Sidebar + Topbar + Content)
  if (location.pathname === "/app/dashboard") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center gap-4 flex-wrap p-4 bg-white border-b border-gray-100 shadow-sm">
        <span className="text-xl font-bold tracking-tight text-gray-900">KOPERA OS</span>
        <div className="relative">
          <div data-testid="business-selector">
            <span className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer">
              {currentBusiness?.name ?? "Select business"}
            </span>
            <ul data-testid="business-selector-list" className="absolute z-10 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden py-1">
              {businesses.map((b) => (
                <li
                  key={b.id}
                  data-testid={`business-selector-option-${b.id}`}
                  onClick={() => selectBusiness(b.id)}
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  {b.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="relative">
          <div data-testid="location-selector">
            <span className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer">
              {currentLocation?.name ?? currentLocationId ?? "Select location"}
            </span>
            <ul data-testid="location-selector-list" className="absolute z-10 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden py-1">
              {locations.map((l) => (
                <li
                  key={l.id}
                  data-testid={`location-selector-option-${l.id}`}
                  onClick={() => selectLocation(l.id)}
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  {l.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <nav className="app-nav" aria-label="Primary" />
        <div className="flex items-center gap-2 ml-auto">
          <span data-testid="user-email" className="text-sm text-gray-600">{user?.email ?? ""}</span>
          <button
            type="button"
            onClick={() => void logout()}
            data-testid="logout-btn"
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="p-4 sm:p-6 lg:p-8 flex-1">{children}</main>
    </div>
  );
}
