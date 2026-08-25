import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { deletePurchaseOrder } from "../purchasing/purchasingService";
import { ApiError } from "../auth/types";

export function PurchaseOrderDelete() {
  const { poId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!currentBusinessId || !poId) return;
    setLoading(true);
    setError(null);
    deletePurchaseOrder(currentBusinessId, poId)
      .then(() => navigate("/purchasing"))
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Failed to delete purchase order");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div data-testid="purchase-order-delete" className="space-y-4">
            {error && (
              <div data-testid="purchase-order-delete-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">
                {error}
              </div>
            )}
            <button
              data-testid="purchase-order-delete-confirm-button"
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed py-3 px-4"
            >
              {loading ? "Deleting…" : "Delete purchase order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
