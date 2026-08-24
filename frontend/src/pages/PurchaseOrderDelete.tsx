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
    <div data-testid="purchase-order-delete">
      {error && <div data-testid="purchase-order-delete-error">{error}</div>}
      <button
        data-testid="purchase-order-delete-confirm-button"
        onClick={handleDelete}
        disabled={loading}
      >
        {loading ? "Deleting…" : "Delete purchase order"}
      </button>
    </div>
  );
}
