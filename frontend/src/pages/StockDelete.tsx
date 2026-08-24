import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteStock } from "../inventory/inventoryService";
import { ApiError } from "../auth/types";

export function StockDelete() {
  const { stockId } = useParams<{ stockId: string }>();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!stockId) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteStock(stockId);
      navigate("/inventory/stocks");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to delete stock",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div data-testid="stock-delete">
      {error && <div data-testid="stock-delete-error">{error}</div>}
      <button
        type="button"
        data-testid="stock-delete-confirm-button"
        onClick={handleDelete}
        disabled={deleting}
      >
        {deleting ? "…" : "Delete stock"}
      </button>
    </div>
  );
}