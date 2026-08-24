import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useBusiness } from "../business/BusinessContext";
import {
  createBusiness,
  createLocation,
  createSubscription,
  listPlans,
} from "../business/businessService";
import type { Plan } from "../business/types";
import { ApiError } from "../auth/types";

export function Onboarding() {
  const { status } = useAuth();
  const business = useBusiness();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [bizName, setBizName] = useState("");
  const [locName, setLocName] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hadBusinessOnMount = useRef(business.currentBusinessId != null);

  useEffect(() => {
    const completedSession =
      business.subscriptionCreated &&
      !!business.currentBusiness &&
      !!business.currentLocation;
    const returningUser =
      business.isOnboardingComplete && hadBusinessOnMount.current;
    if (completedSession || returningUser) {
      navigate("/app", { replace: true });
    }
  }, [
    business.isOnboardingComplete,
    business.subscriptionCreated,
    business.currentBusiness,
    business.currentLocation,
    navigate,
  ]);

  useEffect(() => {
    if (step === 4) {
      listPlans()
        .then(setPlans)
        .catch(() => setPlans([]));
    }
  }, [step]);

  if (status === "loading") {
    return <div role="status">Loading…</div>;
  }
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  async function submitBusiness(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const created = await createBusiness(bizName.trim());
      business.addBusiness(created);
      setStep(2);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create business",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitLocation(e: FormEvent) {
    e.preventDefault();
    if (!business.currentBusinessId) return;
    setError(null);
    setBusy(true);
    try {
      const created = await createLocation(
        business.currentBusinessId,
        locName.trim(),
      );
      await business.refreshLocations();
      business.selectLocation(created.id);
      setStep(3);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create location",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitSubscription(e: FormEvent) {
    e.preventDefault();
    if (!business.currentBusinessId) return;
    setError(null);
    setBusy(true);
    try {
      await createSubscription(business.currentBusinessId);
      business.setSubscriptionCreated(true);
      setStep(4);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to create subscription",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="onboarding" className="onboarding">
      <h1>Onboarding</h1>
      {error && (
        <p role="alert" data-testid="onboarding-error">
          {error}
        </p>
      )}

      {step === 1 && (
        <form onSubmit={submitBusiness}>
          <h2>Business</h2>
          <input
            type="text"
            placeholder="Business name"
            value={bizName}
            onChange={(e) => setBizName(e.target.value)}
            data-testid="business-name-input"
            required
          />
          <button type="submit" disabled={busy} data-testid="business-submit">
            {busy ? "…" : "Create business"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={submitLocation}>
          <h2>Location</h2>
          <input
            type="text"
            placeholder="Location name"
            value={locName}
            onChange={(e) => setLocName(e.target.value)}
            data-testid="location-name-input"
            required
          />
          <button type="submit" disabled={busy} data-testid="location-submit">
            {busy ? "…" : "Create location"}
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={submitSubscription}>
          <h2>Subscription</h2>
          <button
            type="submit"
            disabled={busy}
            data-testid="subscription-submit"
          >
            {busy ? "…" : "Create subscription"}
          </button>
        </form>
      )}

      {step === 4 && (
        <div data-testid="plans">
          <h2>Plans</h2>
          <ul data-testid="plans-list">
            {plans.map((p) => (
              <li key={p.id} data-testid={`plan-option-${p.id}`}>
                {p.name} — {p.amount} {p.currency} / {p.billing_interval}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => navigate("/app", { replace: true })}
            data-testid="plans-continue"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
