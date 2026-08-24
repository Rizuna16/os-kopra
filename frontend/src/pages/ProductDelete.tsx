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
    <div data-testid="product-delete">
      {error && <div data-testid="product-delete-error">{error}</div>}
      <button
        data-testid="product-delete-confirm-button"
        onClick={handleDelete}
        disabled={loading}
      >
        {loading ? "Deleting…" : "Delete product"}
      </button>
    </div>
  );
}