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
    <div data-testid="promotion-delete" className="space-y-4 pt-4 border-t border-gray-100">
      <button
        type="button"
        data-testid="promotion-delete-submit"
        onClick={handleDelete}
        disabled={deleting}
        className="py-3 px-4 bg-red-600 hover:bg-red-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {deleting ? "…" : "Delete promotion"}
      </button>
      {deleting && (
        <span data-testid="promotion-delete-deleting" className="ml-2 text-sm text-gray-500">
          Deleting…
        </span>
      )}
      {error && (
        <div
          data-testid="promotion-delete-error"
          className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4 mt-2"
        >
          {error}
        </div>
      )}
    </div>
  );
}
