import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { deletePromotion } from "../promotion_loyalty/promotionLoyaltyService";
import { ApiError } from "../auth/types";

export function PromotionDelete() {
  const { promotionId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!currentBusinessId || !promotionId) return;
    setError(null);
    setDeleting(true);
    try {
      await deletePromotion(currentBusinessId, promotionId);
      navigate("/promotions");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete promotion");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div data-testid="promotion-delete" className="p-4 space-y-3">
      <button
        type="button"
        data-testid="promotion-delete-submit"
        onClick={handleDelete}
        disabled={deleting}
        className="bg-red-600 text-white rounded px-3 py-1"
      >
        {deleting ? "…" : "Delete promotion"}
      </button>
      {deleting && <span data-testid="promotion-delete-deleting">Deleting…</span>}
      {error && <div data-testid="promotion-delete-error" className="text-red-600">{error}</div>}
    </div>
  );
}
