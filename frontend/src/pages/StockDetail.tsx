import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getStock } from "../inventory/inventoryService";
import type { Stock } from "../inventory/types";
import { ApiError } from "../auth/types";

export function StockDetail() {
  const { stockId } = useParams<{ stockId: string }>();
  const navigate = useNavigate();
  const [stock, setStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stockId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getStock(stockId)
      .then((data) => {
        if (cancelled) return;
        setStock(data);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setError(e instanceof ApiError ? e.message : "Failed to load stock");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stockId, navigate]);

  if (loading) return <div data-testid="stock-detail-loading">Loading…</div>;
  if (error) return <div data-testid="stock-detail-error">{error}</div>;
  if (!stock) return <div data-testid="stock-detail-empty">No stock.</div>;
  return (
    <div data-testid="stock-detail">
      <div data-testid="stock-id">{stock.id}</div>
      <div data-testid="stock-location">{stock.location}</div>
      <div data-testid="stock-variant">{stock.variant}</div>
      <div data-testid="stock-quantity">{stock.quantity}</div>
    </div>
  );
}