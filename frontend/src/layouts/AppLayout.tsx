import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { useBusiness } from "../business/BusinessContext";

export function AppLayout({ children }: { children: ReactNode }) {
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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center gap-4 flex-wrap p-4 bg-gray-100 border-b">
        <span className="font-bold">KOPERA OS</span>
        <div className="relative">
          <div data-testid="business-selector">
            <span>{currentBusiness?.name ?? "Select business"}</span>
            <ul data-testid="business-selector-list">
              {businesses.map((b) => (
                <li
                  key={b.id}
                  data-testid={`business-selector-option-${b.id}`}
                  onClick={() => selectBusiness(b.id)}
                >
                  {b.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="relative">
          <div data-testid="location-selector">
            <span>
              {currentLocation?.name ?? currentLocationId ?? "Select location"}
            </span>
            <ul data-testid="location-selector-list">
              {locations.map((l) => (
                <li
                  key={l.id}
                  data-testid={`location-selector-option-${l.id}`}
                  onClick={() => selectLocation(l.id)}
                >
                  {l.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <nav className="app-nav" aria-label="Primary" />
        <div className="flex items-center gap-2 ml-auto">
          <span data-testid="user-email">{user?.email ?? ""}</span>
          <button
            type="button"
            onClick={() => void logout()}
            data-testid="logout-btn"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="p-4 flex-1">{children}</main>
    </div>
  );
}
