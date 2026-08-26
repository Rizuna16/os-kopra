import { useEffect, useState } from "react";
import { useBusiness } from "../business/BusinessContext";
import { listPlans, createSubscription, createPayment } from "../business/businessService";
import type { PaymentResponse, Plan } from "../business/types";
import { ApiError } from "../auth/types";

export function Billing() {
  const { currentBusinessId, subscriptionCreated, setSubscriptionCreated } = useBusiness();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listPlans()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setPlans(list);
        if (list.length > 0) {
          setSelectedPlanId((prev) => prev ?? list[0].id);
        }
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
      const sub = await createSubscription(currentBusinessId);
      if (sub?.id) setSubscriptionId(sub.id);
      setSubscriptionCreated(true);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to create subscription");
    } finally {
      setActionBusy(false);
    }
  }

  async function handlePay() {
    if (!subscriptionId || !selectedPlanId) return;
    setPaymentBusy(true);
    setPaymentError(null);
    try {
      const result = await createPayment(subscriptionId, selectedPlanId);
      setPayment(result);
    } catch (err) {
      setPaymentError(err instanceof ApiError ? err.message : "Payment initiation failed");
    } finally {
      setPaymentBusy(false);
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
          <div className="space-y-4">
            <div data-testid="subscription-created-badge" className="inline-flex items-center px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
              Subscription Created
            </div>

            {!payment && (
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-600">Complete your subscription by making a payment.</p>
                {plans.length > 1 && (
                  <select
                    value={selectedPlanId ?? ""}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    data-testid="plan-select"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-800"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.currency} {p.amount})
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  disabled={paymentBusy || !selectedPlanId || !subscriptionId}
                  onClick={handlePay}
                  data-testid="pay-cta"
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paymentBusy ? "Processing..." : "Pay Now"}
                </button>
                {paymentBusy && (
                  <div data-testid="payment-loading" className="text-sm text-gray-500">
                    Initiating payment...
                  </div>
                )}
                {paymentError && (
                  <div data-testid="payment-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-4">
                    {paymentError}
                  </div>
                )}
              </div>
            )}

            {payment && (
              <div data-testid="payment-redirect" className="space-y-3 border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-600">Payment initiated. Complete your payment to activate the subscription.</p>
                <a
                  href={payment.redirect_url}
                  data-testid="payment-redirect-link"
                  className="inline-block py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 font-medium text-sm text-white rounded-xl shadow-sm"
                >
                  Continue to Payment
                </a>
              </div>
            )}
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
