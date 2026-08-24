import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { listStocks } from "../inventory/inventoryService";
import type { Stock } from "../inventory/types";
import { ApiError } from "../auth/types";

export function StockList() {
  const { currentBusinessId, currentLocationId } = useBusiness();
  const navigate = useNavigate();
  const [loc, setLoc] = useState<string | null>(currentLocationId);
  useEffect(() => {
    if (currentLocationId) setLoc(currentLocationId);
  }, [currentLocationId]);
  const [items, setItems] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId || !loc) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listStocks(currentBusinessId, loc)
      .then((data) => {
        if (cancelled) return;
        setItems(data);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setError(e instanceof ApiError ? e.message : "Failed to load stocks");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, loc, navigate]);

  if (loading) return <div data-testid="stock-list-loading">Loading…</div>;
  if (error) return <div data-testid="stock-list-error">{error}</div>;
  return (
    <div data-testid="stock-list">
      {items.length === 0 ? (
        <div data-testid="stock-list-empty">No stocks.</div>
      ) : (
        <ul>
          {items.map((s) => (
            <li key={s.id} data-testid={`stock-item-${s.id}`}>
              {s.quantity}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}