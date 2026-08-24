import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { listJournals } from "../finance/financeService";
import type { Journal } from "../finance/types";
import { ApiError } from "../auth/types";

export function FinanceJournalList() {
  const { currentBusinessId } = useBusiness();
  const [items, setItems] = useState<Journal[]>([]);
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
    listJournals(currentBusinessId)
      .then((data) => {
        if (!cancelled) setItems(data ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof ApiError ? e.message : "Failed to load journals";
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId]);

  if (loading) return <div data-testid="finance-journal-list-loading">Loading…</div>;
  if (error) return <div data-testid="finance-journal-list-error">{error}</div>;
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Journals</h1>
        <Link to="/finance/journals/new" className="bg-blue-600 text-white rounded px-3 py-1">
          New journal
        </Link>
      </div>
      <div data-testid="finance-journal-list">
        {items.length === 0 ? (
          <div data-testid="finance-journal-list-empty">No journals.</div>
        ) : (
          <ul className="divide-y">
            {items.map((j) => (
              <li key={j.id} data-testid={`finance-journal-item-${j.id}`}>
                <Link to={`/finance/journals/${j.id}`} className="text-blue-600 hover:underline">
                  {j.reference}
                </Link>
                <span className="ml-2 text-sm text-gray-600">({j.status})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}