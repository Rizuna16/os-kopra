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

  if (loading) return <div data-testid="promotion-list-loading">Loading…</div>;
  if (error) return <div data-testid="promotion-list-error">{error}</div>;
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Promotions</h1>
        <Link
          to="/promotions/new"
          className="bg-blue-600 text-white rounded px-3 py-1"
        >
          New promotion
        </Link>
      </div>
      <div data-testid="promotion-list">
        {!items || items.length === 0 ? (
          <div data-testid="promotion-list-empty">No promotions.</div>
        ) : (
          <ul className="divide-y">
            {items.map((s) => (
              <li key={s.id} data-testid={`promotion-item-${s.id}`}>
                <Link
                  to={`/promotions/${s.id}`}
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
