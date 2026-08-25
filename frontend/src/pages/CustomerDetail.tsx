import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getCustomer } from "../customer/customerService";
import type { Customer } from "../customer/types";
import { ApiError } from "../auth/types";
import { CustomerDelete } from "./CustomerDelete";

export function CustomerDetail() {
  const { customerId } = useParams();
  const { currentBusinessId } = useBusiness();
  const [item, setItem] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId || !customerId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCustomer(currentBusinessId, customerId)
      .then((d) => {
        if (!cancelled) setItem(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load customer");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, customerId]);

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Customer</h1>
            <div data-testid="customer-detail-loading">Loading…</div>
          </div>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Customer</h1>
            <div data-testid="customer-detail-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">{error}</div>
          </div>
        </div>
      </div>
    );
  if (!item) return <div data-testid="customer-detail">No customer.</div>;
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Customer</h1>
          <div data-testid="customer-detail" className="space-y-2">
            <p data-testid="customer-detail-id">{item.id}</p>
            <p data-testid="customer-detail-business">{item.business}</p>
            <p data-testid="customer-detail-name">{item.name}</p>
            <p data-testid="customer-detail-phone">{item.phone}</p>
            <p data-testid="customer-detail-email">{item.email}</p>
            <p data-testid="customer-detail-address">{item.address}</p>
            <p data-testid="customer-detail-created-at">{item.created_at}</p>
            <p data-testid="customer-detail-updated-at">{item.updated_at}</p>
            <CustomerDelete />
          </div>
        </div>
      </div>
    </div>
  );
}
