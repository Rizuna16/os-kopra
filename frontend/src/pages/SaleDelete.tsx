import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { deleteSale } from "../sales/saleService";
import { ApiError } from "../auth/types";

export function SaleDelete() {
  const { saleId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!currentBusinessId || !saleId) return;
    setLoading(true);
    setError(null);
    deleteSale(currentBusinessId, saleId)
      .then(() => navigate("/sales"))
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Failed to delete sale");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div data-testid="sale-delete">
      {error && <div data-testid="sale-delete-error">{error}</div>}
      <button
        data-testid="sale-delete-confirm-button"
        onClick={handleDelete}
        disabled={loading}
      >
        {loading ? "Deleting…" : "Delete sale"}
      </button>
    </div>
  );
}
