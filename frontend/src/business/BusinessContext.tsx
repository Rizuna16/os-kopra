import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "../auth/types";
import {
  loadBusinesses,
  saveBusinesses,
  loadCurrentBusinessId,
  saveCurrentBusinessId,
  loadCurrentLocationId,
  saveCurrentLocationId,
} from "./storage";
import { listLocations } from "./businessService";
import type { BusinessSummary, LocationSummary } from "./types";

export interface BusinessContextValue {
  businesses: BusinessSummary[];
  currentBusinessId: string | null;
  currentLocationId: string | null;
  currentBusiness: BusinessSummary | null;
  locations: LocationSummary[];
  currentLocation: LocationSummary | null;
  selectBusiness: (id: string) => void;
  selectLocation: (id: string) => void;
  addBusiness: (business: BusinessSummary) => void;
  refreshLocations: () => Promise<void>;
  isOnboardingComplete: boolean;
  subscriptionCreated: boolean;
  setSubscriptionCreated: (value: boolean) => void;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [subscriptionCreated, setSubscriptionCreated] = useState(false);

  const removeStaleBusiness = useCallback((businessId: string) => {
    setBusinesses((prev) => {
      const next = prev.filter((b) => b.id !== businessId);
      saveBusinesses(next);
      return next;
    });
    setCurrentBusinessId((prev) => {
      if (prev === businessId) {
        saveCurrentBusinessId(null);
        return null;
      }
      return prev;
    });
    setCurrentLocationId(null);
    saveCurrentLocationId(null);
    setLocations([]);
  }, []);

  const loadLocations = useCallback(
    async (businessId: string, savedLocationId: string | null) => {
      try {
        const fetched = await listLocations(businessId);
        const safe = Array.isArray(fetched) ? fetched : [];
        setLocations(safe);
        if (safe.some((l) => l.id === savedLocationId)) {
          setCurrentLocationId(savedLocationId);
          saveCurrentLocationId(savedLocationId);
        } else if (safe.length > 0) {
          setCurrentLocationId(safe[0].id);
          saveCurrentLocationId(safe[0].id);
        } else {
          setCurrentLocationId(null);
          saveCurrentLocationId(null);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          removeStaleBusiness(businessId);
          return;
        }
        /* network/other errors: keep existing state */
      }
    },
    [removeStaleBusiness],
  );

  useEffect(() => {
    const stored = loadBusinesses();
    const cbId = loadCurrentBusinessId();
    const clId = loadCurrentLocationId();
    setBusinesses(stored);
    setCurrentBusinessId(cbId);
    setCurrentLocationId(clId);
    if (cbId) {
      void loadLocations(cbId, clId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectBusiness = useCallback(
    (id: string) => {
      if (!businesses.some((b) => b.id === id)) return;
      setCurrentBusinessId(id);
      saveCurrentBusinessId(id);
      setCurrentLocationId(null);
      saveCurrentLocationId(null);
      setLocations([]);
      void loadLocations(id, null);
    },
    [businesses, loadLocations],
  );

  const selectLocation = useCallback((id: string) => {
    setCurrentLocationId(id);
    saveCurrentLocationId(id);
  }, []);

  const addBusiness = useCallback((business: BusinessSummary) => {
    setBusinesses((prev) => {
      if (prev.some((b) => b.id === business.id)) return prev;
      const next = [...prev, business];
      saveBusinesses(next);
      return next;
    });
    setCurrentBusinessId((prev) => {
      if (!prev) {
        saveCurrentBusinessId(business.id);
        return business.id;
      }
      return prev;
    });
  }, []);

  const refreshLocations = useCallback(async () => {
    if (!currentBusinessId) return;
    await loadLocations(currentBusinessId, loadCurrentLocationId());
  }, [currentBusinessId, loadLocations]);

  const currentBusiness =
    businesses.find((b) => b.id === currentBusinessId) ?? null;

  const resolvedLocation =
    currentLocationId &&
    locations.find((l) => l.id === currentLocationId);
  const currentLocation: LocationSummary | null = resolvedLocation
    ? resolvedLocation
    : currentLocationId
      ? { id: currentLocationId, name: currentLocationId }
      : null;

  const isOnboardingComplete = !!currentBusiness && !!currentLocation;

  const value: BusinessContextValue = {
    businesses,
    currentBusinessId,
    currentLocationId,
    currentBusiness,
    locations,
    currentLocation,
    selectBusiness,
    selectLocation,
    addBusiness,
    refreshLocations,
    isOnboardingComplete,
    subscriptionCreated,
    setSubscriptionCreated,
  };

  return (
    <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
  );
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return ctx;
}
