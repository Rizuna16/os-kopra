import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getStock, updateStock } from "../inventory/inventoryService";
import type { Stock } from "../inventory/types";
import { ApiError } from "../auth/types";

export function StockEdit() {
  const { stockId } = useParams<{ stockId: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stockId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getStock(stockId)
      .then((data: Stock) => {
        if (cancelled) return;
        setQuantity(data.quantity);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockId) return;
    setError(null);
    setSubmitting(true);
    try {
      const qty = Number(quantity);
      await updateStock(stockId, { quantity: qty });
      navigate("/inventory/stocks");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(
        err instanceof ApiError && err.errors?.quantity
          ? err.errors.quantity[0]
          : err instanceof Error
            ? err.message
            : "Failed to update stock",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div data-testid="stock-edit-loading">Loading…</div>;
  if (error) return <div data-testid="stock-edit-error">{error}</div>;
  return (
    <form data-testid="stock-edit-form" onSubmit={handleSubmit}>
      <input
        id="stock-quantity"
        type="text"
        data-testid="stock-quantity-input"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />
      <button
        type="submit"
        data-testid="stock-edit-submit"
        disabled={submitting}
      >
        {submitting ? "…" : "Save"}
      </button>
    </form>
  );
}