import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { deleteVariant } from "../product/variantService";
import { ApiError } from "../auth/types";

export function VariantDelete() {
  const { productId, variantId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const onDelete = async () => {
    if (!currentBusinessId || !productId || !variantId) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteVariant(currentBusinessId, productId, variantId);
      navigate(`/products/${productId}/variants`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete variant");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div data-testid="variant-delete" className="p-4 space-y-3">
      <button
        type="button"
        data-testid="variant-delete-submit"
        onClick={onDelete}
        disabled={deleting}
        className="bg-red-600 text-white rounded px-3 py-1"
      >
        {deleting ? "…" : "Delete variant"}
      </button>
      {error && <div data-testid="variant-delete-error" className="text-red-600">{error}</div>}
    </div>
  );
}
