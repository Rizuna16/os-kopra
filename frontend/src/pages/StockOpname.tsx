import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { opnameStock } from "../inventory/inventoryService";
import { ApiError } from "../auth/types";
import type { Stock } from "../inventory/types";

export function StockOpname() {
  const { currentLocationId } = useBusiness();
  const navigate = useNavigate();
  const [location, setLocation] = useState(currentLocationId ?? "");
  const [variant, setVariant] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Stock | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setDetail(null);
    const qty = quantity === "" ? 0 : Number(quantity);
    setSubmitting(true);
    try {
      const res = await opnameStock({ location, variant, quantity: qty });
      if ("detail" in res && res.detail) {
        setDetail(res.detail);
      } else {
        setResult(res as Stock);
      }
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
            : "Failed to perform opname",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form data-testid="stock-opname-form" onSubmit={handleSubmit}>
      <select
        data-testid="stock-opname-location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      >
        <option value="">Select location</option>
      </select>
      <select
        data-testid="stock-opname-variant"
        value={variant}
        onChange={(e) => setVariant(e.target.value)}
      >
        <option value="">Select variant</option>
      </select>
      <input
        type="text"
        data-testid="stock-opname-quantity"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />
      <button
        type="submit"
        data-testid="stock-opname-submit"
        disabled={submitting}
      >
        {submitting ? "…" : "Opname"}
      </button>
      {error && <div data-testid="stock-opname-error">{error}</div>}
      {result && (
        <div data-testid="stock-opname-result">
          <div data-testid="stock-opname-quantity-result">{result.quantity}</div>
        </div>
      )}
      {detail && <div data-testid="stock-opname-detail-result">{detail}</div>}
    </form>
  );
}