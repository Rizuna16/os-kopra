import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { listCustomers } from "../customer/customerService";
import type { Customer } from "../customer/types";
import { ApiError } from "../auth/types";

export function CustomerList() {
  const { currentBusinessId } = useBusiness();
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listCustomers(currentBusinessId)
      .then((data) => {
        if (cancelled) return;
        setItems(data);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof ApiError ? e.message : "Failed to load customers";
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId]);

  if (loading) return <div data-testid="customer-list-loading">Loading…</div>;
  if (error) return <div data-testid="customer-list-error">{error}</div>;
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Link
          to="/customers/new"
          className="bg-blue-600 text-white rounded px-3 py-1"
        >
          New customer
        </Link>
      </div>
      <div data-testid="customer-list">
        {items.length === 0 ? (
          <div data-testid="customer-list-empty">No customers.</div>
        ) : (
          <ul className="divide-y">
            {items.map((s) => (
              <li key={s.id} data-testid={`customer-item-${s.id}`}>
                <Link
                  to={`/customers/${s.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
