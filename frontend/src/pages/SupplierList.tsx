import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { listSuppliers } from "../supplier/supplierService";
import type { Supplier } from "../supplier/types";
import { ApiError } from "../auth/types";

export function SupplierList() {
  const { currentBusinessId } = useBusiness();
  const [items, setItems] = useState<Supplier[]>([]);
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
    listSuppliers(currentBusinessId)
      .then((data) => {
        if (cancelled) return;
        setItems(data);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof ApiError ? e.message : "Failed to load suppliers";
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId]);

  if (loading) return <div data-testid="supplier-list-loading">Loading…</div>;
  if (error) return <div data-testid="supplier-list-error">{error}</div>;
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <Link
          to="/suppliers/new"
          className="bg-blue-600 text-white rounded px-3 py-1"
        >
          New supplier
        </Link>
      </div>
      <div data-testid="supplier-list">
        {items.length === 0 ? (
          <div data-testid="supplier-list-empty">No suppliers.</div>
        ) : (
          <ul className="divide-y">
            {items.map((s) => (
              <li key={s.id} data-testid={`supplier-item-${s.id}`}>
                <Link
                  to={`/suppliers/${s.id}`}
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
