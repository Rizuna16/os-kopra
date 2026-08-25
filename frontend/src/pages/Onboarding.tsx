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
    <div data-testid="onboarding" className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-100 shadow-xl p-6 sm:p-8">

        {/* Horizontal Progress Indicator */}
        <div className="w-full mb-8">
          <div className="flex items-center justify-between relative">
            {/* Background progress lines */}
            <div className="absolute top-4 left-[12.5%] right-[12.5%] h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
            <div
              className="absolute top-4 left-[12.5%] right-[12.5%] h-0.5 bg-blue-600 -translate-y-1/2 transition-all duration-500 z-0"
              style={{
                width: step === 1 ? "0%" : step === 2 ? "33.33%" : step === 3 ? "66.66%" : "100%"
              }}
            />

            {/* Step 1 — Business */}
            <div className="flex flex-col items-center flex-1 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                step > 1
                  ? "bg-blue-600 text-white"
                  : step === 1
                    ? "bg-blue-600 text-white ring-4 ring-blue-100"
                    : "bg-gray-200 text-gray-500"
              }`}>
                {step > 1 ? (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : "1"}
              </div>
              <span className={`mt-2 text-xs sm:text-sm font-medium transition-colors duration-300 ${
                step === 1
                  ? "text-blue-600 font-semibold"
                  : step > 1
                    ? "text-gray-900"
                    : "text-gray-500"
              }`}>
                Business
              </span>
            </div>

            {/* Step 2 — Location */}
            <div className="flex flex-col items-center flex-1 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                step > 2
                  ? "bg-blue-600 text-white"
                  : step === 2
                    ? "bg-blue-600 text-white ring-4 ring-blue-100"
                    : "bg-gray-200 text-gray-500"
              }`}>
                {step > 2 ? (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : "2"}
              </div>
              <span className={`mt-2 text-xs sm:text-sm font-medium transition-colors duration-300 ${
                step === 2
                  ? "text-blue-600 font-semibold"
                  : step > 2
                    ? "text-gray-900"
                    : "text-gray-500"
              }`}>
                Location
              </span>
            </div>

            {/* Step 3 — Subscription */}
            <div className="flex flex-col items-center flex-1 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                step > 3
                  ? "bg-blue-600 text-white"
                  : step === 3
                    ? "bg-blue-600 text-white ring-4 ring-blue-100"
                    : "bg-gray-200 text-gray-500"
              }`}>
                {step > 3 ? (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : "3"}
              </div>
              <span className={`mt-2 text-xs sm:text-sm font-medium transition-colors duration-300 ${
                step === 3
                  ? "text-blue-600 font-semibold"
                  : step > 3
                    ? "text-gray-900"
                    : "text-gray-500"
              }`}>
                Subscription
              </span>
            </div>

            {/* Step 4 — Plans */}
            <div className="flex flex-col items-center flex-1 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                step > 4
                  ? "bg-blue-600 text-white"
                  : step === 4
                    ? "bg-blue-600 text-white ring-4 ring-blue-100"
                    : "bg-gray-200 text-gray-500"
              }`}>
                {step > 4 ? (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : "4"}
              </div>
              <span className={`mt-2 text-xs sm:text-sm font-medium transition-colors duration-300 ${
                step === 4
                  ? "text-blue-600 font-semibold"
                  : step > 4
                    ? "text-gray-900"
                    : "text-gray-500"
              }`}>
                Plans
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Onboarding</h1>
          <p className="text-sm text-gray-600 mt-1 mb-6">Complete your account setup to start using KOPERA OS</p>

          {error && (
            <p role="alert" data-testid="onboarding-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4 mb-4">
              {error}
            </p>
          )}

          {step === 1 && (
            <form onSubmit={submitBusiness} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Business</h2>
              <div>
                <label htmlFor="business-name-input" className="text-sm font-medium text-gray-700 block mb-1">Business name</label>
                <input
                  id="business-name-input"
                  type="text"
                  placeholder="Business name"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  data-testid="business-name-input"
                  required
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                data-testid="business-submit"
                className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed w-full"
              >
                {busy ? "…" : "Create business"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={submitLocation} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Location</h2>
              <div>
                <label htmlFor="location-name-input" className="text-sm font-medium text-gray-700 block mb-1">Location name</label>
                <input
                  id="location-name-input"
                  type="text"
                  placeholder="Location name"
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  data-testid="location-name-input"
                  required
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                data-testid="location-submit"
                className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed w-full"
              >
                {busy ? "…" : "Create location"}
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={submitSubscription} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
              <button
                type="submit"
                disabled={busy}
                data-testid="subscription-submit"
                className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed w-full"
              >
                {busy ? "…" : "Create subscription"}
              </button>
            </form>
          )}

          {step === 4 && (
            <div data-testid="plans" className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Plans</h2>
              <ul data-testid="plans-list" className="space-y-3">
                {plans.map((p) => (
                  <li
                    key={p.id}
                    data-testid={`plan-option-${p.id}`}
                    className="border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-blue-600 transition-all bg-white"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-gray-900 text-base">{p.name}</div>
                        <div className="text-xs text-gray-500 mt-1 capitalize">
                          {p.billing_interval.toLowerCase()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">
                          {p.amount} {p.currency}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => navigate("/app", { replace: true })}
                data-testid="plans-continue"
                className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed w-full"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
