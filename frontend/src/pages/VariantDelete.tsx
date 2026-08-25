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
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Delete Variant</h1>
          <div data-testid="variant-delete" className="space-y-3">
            <button
              type="button"
              data-testid="variant-delete-submit"
              onClick={onDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? "…" : "Delete variant"}
            </button>
            {error && <div data-testid="variant-delete-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
