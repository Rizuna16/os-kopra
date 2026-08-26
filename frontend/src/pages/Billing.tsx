import { useEffect, useState } from "react";
import { useBusiness } from "../business/BusinessContext";
import { listPlans, createSubscription } from "../business/businessService";
import type { Plan } from "../business/types";
import { ApiError } from "../auth/types";

export function Billing() {
  const { currentBusinessId, subscriptionCreated, setSubscriptionCreated } = useBusiness();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listPlans()
      .then((data) => {
        setPlans(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load plans");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleCreateSubscription() {
    if (!currentBusinessId) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await createSubscription(currentBusinessId);
      setSubscriptionCreated(true);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to create subscription");
    } finally {
      setActionBusy(false);
    }
  }

  const plansToRender = plans ?? [];

  if (loading) {
    return (
      <div data-testid="billing-page" className="p-6">
        <div data-testid="billing-loading" className="text-gray-500">
          Loading billing plans...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="billing-page" className="p-6">
        <div data-testid="billing-error" className="text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="billing-page" className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription &amp; Billing</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your KOPERA OS business plans and subscription.</p>
      </div>

      {actionError && (
        <div data-testid="action-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-4">
          {actionError}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Subscription</h2>
        {subscriptionCreated ? (
          <div data-testid="subscription-created-badge" className="inline-flex items-center px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
            Subscription Created
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">You don&apos;t have an active subscription for this business yet.</p>
            <button
              type="button"
              disabled={actionBusy}
              onClick={handleCreateSubscription}
              data-testid="create-subscription-cta"
              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionBusy ? "Creating..." : "Start Subscription"}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Available Plans</h2>
        {plansToRender.length === 0 ? (
          <div data-testid="billing-empty-plans" className="text-gray-500 py-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center">
            No plans available.
          </div>
        ) : (
          <div data-testid="plans-list" className="grid gap-6 md:grid-cols-2">
            {plansToRender.map((p) => (
              <div
                key={p.id}
                data-testid={`plan-${p.id}`}
                className="border border-gray-200 rounded-2xl p-6 bg-white hover:shadow-md transition-shadow relative"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{p.name}</h3>
                    <p className="text-xs font-mono text-gray-500 uppercase mt-1">{p.code}</p>
                  </div>
                  <div className="text-right">
                    <span
                      data-testid={`plan-${p.id}-amount`}
                      className="text-xl font-extrabold text-blue-600 block"
                    >
                      {p.amount}
                      <span className="text-sm font-semibold text-gray-500 ml-1">{p.currency}</span>
                    </span>
                    <span className="text-xs text-gray-400 capitalize block mt-1">
                      per {p.billing_interval.toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
