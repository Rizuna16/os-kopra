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
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Delete Stock</h1>
          <div data-testid="stock-delete">
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4 mb-4" data-testid="stock-delete-error">{error}</div>}
            <button
              type="button"
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="stock-delete-confirm-button"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "…" : "Delete stock"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}