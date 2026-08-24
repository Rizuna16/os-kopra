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
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">New loyalty record</h1>
      <form data-testid="customer-loyalty-record-create-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="customer" className="block">Customer</label>
          <select
            id="customer"
            data-testid="customer-loyalty-record-customer-input"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="border rounded px-2 py-1 w-full"
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
          <label htmlFor="points_balance" className="block">Points balance</label>
          <input
            id="points_balance"
            type="number"
            step="0.01"
            data-testid="customer-loyalty-record-points-input"
            ref={pointsRef}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        {error && <div data-testid="customer-loyalty-record-create-error" className="text-red-600">{error}</div>}
        <button
          type="submit"
          data-testid="customer-loyalty-record-create-submit"
          disabled={submitting}
          className="bg-blue-600 text-white rounded px-3 py-1"
        >
          {submitting ? "…" : "Create record"}
        </button>
      </form>
    </div>
  );
}