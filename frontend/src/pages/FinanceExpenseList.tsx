import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { listExpenses } from "../finance/financeService";
import type { Expense } from "../finance/types";
import { ApiError } from "../auth/types";

export function FinanceExpenseList() {
  const { currentBusinessId } = useBusiness();
  const [items, setItems] = useState<Expense[]>([]);
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
    listExpenses(currentBusinessId)
      .then((data) => {
        if (!cancelled) setItems(data ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof ApiError ? e.message : "Failed to load expenses";
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId]);

  if (loading) return <div data-testid="finance-expense-list-loading">Loading…</div>;
  if (error) return <div data-testid="finance-expense-list-error">{error}</div>;
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <Link to="/finance/expenses/new" className="bg-blue-600 text-white rounded px-3 py-1">
          New expense
        </Link>
      </div>
      <div data-testid="finance-expense-list">
        {items.length === 0 ? (
          <div data-testid="finance-expense-list-empty">No expenses.</div>
        ) : (
          <ul className="divide-y">
            {items.map((e) => (
              <li key={e.id} data-testid={`finance-expense-item-${e.id}`}>
                <div className="text-sm">{e.description}</div>
                <div className="text-right text-sm font-medium">{e.amount}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}