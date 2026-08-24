import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { adjustStock } from "../inventory/inventoryService";
import { ApiError } from "../auth/types";
import type { Stock } from "../inventory/types";

export function StockAdjustment() {
  const { currentLocationId } = useBusiness();
  const navigate = useNavigate();
  const [location, setLocation] = useState(currentLocationId ?? "");
  const [variant, setVariant] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Stock | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const qty = quantity === "" ? 0 : Number(quantity);
    setSubmitting(true);
    try {
      const res = await adjustStock({ location, variant, quantity: qty });
      setResult(res);
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
            : "Failed to adjust stock",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form data-testid="stock-adjustment-form" onSubmit={handleSubmit}>
      <select
        data-testid="stock-adjustment-location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      >
        <option value="">Select location</option>
      </select>
      <select
        data-testid="stock-adjustment-variant"
        value={variant}
        onChange={(e) => setVariant(e.target.value)}
      >
        <option value="">Select variant</option>
      </select>
      <input
        type="text"
        data-testid="stock-adjustment-quantity"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />
      <button
        type="submit"
        data-testid="stock-adjustment-submit"
        disabled={submitting}
      >
        {submitting ? "…" : "Adjust"}
      </button>
      {error && <div data-testid="stock-adjustment-error">{error}</div>}
      {result && (
        <div data-testid="stock-adjustment-result">{result.quantity}</div>
      )}
    </form>
  );
}