import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { listLoyaltyPrograms } from "../promotion_loyalty/promotionLoyaltyService";
import type { LoyaltyProgram } from "../promotion_loyalty/types";
import { ApiError } from "../auth/types";

export function LoyaltyProgramList() {
  const { currentBusinessId } = useBusiness();
  const [items, setItems] = useState<LoyaltyProgram[] | null>([]);
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
    listLoyaltyPrograms(currentBusinessId)
      .then((data) => {
        if (cancelled) return;
        setItems(data);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof ApiError ? e.message : "Failed to load loyalty programs";
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId]);

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Loyalty Programs</h1>
            <div data-testid="loyalty-program-list-loading">Loading…</div>
          </div>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Loyalty Programs</h1>
            <div
              data-testid="loyalty-program-list-error"
              className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4"
            >
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Loyalty Programs</h1>
            <Link
              to="/loyalty-programs/new"
              className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              New loyalty program
            </Link>
          </div>
          <div data-testid="loyalty-program-list">
            {!items || items.length === 0 ? (
              <div data-testid="loyalty-program-list-empty" className="text-gray-500 text-sm">
                No loyalty programs.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((s) => (
                  <li key={s.id} data-testid={`loyalty-program-item-${s.id}`} className="py-3">
                    <Link
                      to={`/loyalty-programs/${s.id}`}
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}