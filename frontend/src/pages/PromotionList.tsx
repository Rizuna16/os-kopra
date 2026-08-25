import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { listPromotions } from "../promotion_loyalty/promotionLoyaltyService";
import type { Promotion } from "../promotion_loyalty/types";
import { ApiError } from "../auth/types";

export function PromotionList() {
  const { currentBusinessId } = useBusiness();
  const [items, setItems] = useState<Promotion[] | null>([]);
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
    listPromotions(currentBusinessId)
      .then((data) => {
        if (cancelled) return;
        setItems(data);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof ApiError ? e.message : "Failed to load promotions";
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Promotions</h1>
            <div data-testid="promotion-list-loading">Loading…</div>
          </div>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Promotions</h1>
            <div
              data-testid="promotion-list-error"
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Promotions</h1>
            <Link
              to="/promotions/new"
              className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              New promotion
            </Link>
          </div>
          <div data-testid="promotion-list">
            {!items || items.length === 0 ? (
              <div data-testid="promotion-list-empty" className="text-gray-500 text-sm">
                No promotions.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((s) => (
                  <li key={s.id} data-testid={`promotion-item-${s.id}`} className="py-3">
                    <Link
                      to={`/promotions/${s.id}`}
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
