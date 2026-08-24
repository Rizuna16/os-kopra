import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { createStock } from "../inventory/inventoryService";
import { listVariantsForBusiness, type Variant } from "../inventory/variantLookup";
import { ApiError } from "../auth/types";

export function StockCreate() {
  const { currentBusinessId, currentLocationId } = useBusiness();
  const navigate = useNavigate();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId) return;
    listVariantsForBusiness(currentBusinessId)
      .then(setVariants)
      .catch(() => setVariants([]));
  }, [currentBusinessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const qty = Number(quantity);
    if (!variantId || !quantity || Number.isNaN(qty) || qty <= 0) {
      setError("Quantity must be a positive number and a variant must be selected.");
      return;
    }
    if (!currentBusinessId || !currentLocationId) return;
    setSubmitting(true);
    try {
      await createStock(currentBusinessId, currentLocationId, {
        variant_id: variantId,
        quantity: qty,
      });
      navigate("/inventory/stocks");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(
        err instanceof ApiError && err.errors?.quantity
          ? err.errors.quantity[0]
          : err instanceof Error
            ? err.message
            : "Failed to create stock",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form data-testid="stock-create-form" onSubmit={handleSubmit}>
      <select
        data-testid="stock-variant-input"
        value={variantId}
        onChange={(e) => setVariantId(e.target.value)}
      >
        <option value="">Select variant</option>
        {variants.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      <input
        id="stock-quantity"
        type="text"
        data-testid="stock-quantity-input"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />
      <button
        type="submit"
        data-testid="stock-create-submit"
        disabled={submitting}
      >
        {submitting ? "…" : "Create stock"}
      </button>
      {error && <div data-testid="stock-create-error">{error}</div>}
    </form>
  );
}