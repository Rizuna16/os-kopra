import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { createCustomerLoyaltyRecord } from "../promotion_loyalty/promotionLoyaltyService";
import type { CustomerLoyaltyRecordPayload } from "../promotion_loyalty/types";
import { listCustomers } from "../customer/customerService";
import type { Customer } from "../customer/types";
import { ApiError } from "../auth/types";

export function CustomerLoyaltyRecordCreate() {
  const { programId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const pointsRef = useRef<HTMLInputElement>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId) return;
    let cancelled = false;
    listCustomers(currentBusinessId)
      .then((data) => {
        if (!cancelled) setCustomers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setCustomers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId || !programId) return;
    if (!customerId) {
      setError("Customer must be selected.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const payload: CustomerLoyaltyRecordPayload = {
      customer: customerId,
      points_balance: pointsRef.current?.value ?? "",
    };
    try {
      await createCustomerLoyaltyRecord(currentBusinessId, programId, payload);
      navigate(`/loyalty-programs/${programId}/customers`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors) {
        const first =
          e.errors.customer?.[0] ??
          e.errors.points_balance?.[0] ??
          e.errors.non_field_errors?.[0];
        setError(first ?? e.message);
      } else {
        setError(e instanceof Error ? e.message : "Failed to create loyalty record");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="customer-loyalty-record-create">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">New loyalty record</h1>
          <form data-testid="customer-loyalty-record-create-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="customer" className="text-sm font-medium text-gray-700 block mb-1">Customer</label>
              <select
                id="customer"
                data-testid="customer-loyalty-record-customer-input"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="points_balance" className="text-sm font-medium text-gray-700 block mb-1">Points balance</label>
              <input
                id="points_balance"
                type="number"
                step="0.01"
                data-testid="customer-loyalty-record-points-input"
                ref={pointsRef}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
            {error && (
              <div
                data-testid="customer-loyalty-record-create-error"
                className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4"
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              data-testid="customer-loyalty-record-create-submit"
              disabled={submitting}
              className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "…" : "Create record"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}