import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { listAccounts } from "../finance/financeService";
import type { Account } from "../finance/types";
import { ApiError } from "../auth/types";

export function FinanceAccountList() {
  const { currentBusinessId } = useBusiness();
  const [items, setItems] = useState<Account[]>([]);
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
    listAccounts(currentBusinessId)
      .then((data) => {
        if (!cancelled) setItems(data ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof ApiError ? e.message : "Failed to load accounts";
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId]);

  if (loading) return <div data-testid="finance-account-list-loading">Loading…</div>;
  if (error) return <div data-testid="finance-account-list-error">{error}</div>;
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <Link to="/finance/accounts/new" className="bg-blue-600 text-white rounded px-3 py-1">
          New account
        </Link>
      </div>
      <div data-testid="finance-account-list">
        {items.length === 0 ? (
          <div data-testid="finance-account-list-empty">No accounts.</div>
        ) : (
          <ul className="divide-y">
            {items.map((a) => (
              <li key={a.id} data-testid={`finance-account-item-${a.id}`}>
                <Link to={`/finance/accounts/${a.id}`} className="text-blue-600 hover:underline">
                  {a.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
