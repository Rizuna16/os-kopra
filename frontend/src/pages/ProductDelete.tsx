import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { deleteProduct } from "../product/productService";
import { ApiError } from "../auth/types";

export function ProductDelete() {
  const { productId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!currentBusinessId || !productId) return;
    setLoading(true);
    setError(null);
    deleteProduct(currentBusinessId, productId)
      .then(() => navigate("/products"))
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Failed to delete product");
      });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Delete Product</h1>
          <div data-testid="product-delete">
            {error && <div data-testid="product-delete-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">{error}</div>}
            <button
              data-testid="product-delete-confirm-button"
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Deleting…" : "Delete product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}