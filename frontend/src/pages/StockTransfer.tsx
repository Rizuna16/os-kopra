import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { transferStock } from "../inventory/inventoryService";
import { ApiError } from "../auth/types";
import type { TransferResponse } from "../inventory/types";

export function StockTransfer() {
  const { currentLocationId, locations } = useBusiness();
  const navigate = useNavigate();
  const [sourceLocation, setSourceLocation] = useState(currentLocationId ?? "");
  const [destinationLocation, setDestinationLocation] = useState("");
  const [variant, setVariant] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TransferResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const qty = quantity === "" ? 0 : Number(quantity);
    setSubmitting(true);
    try {
      const res = await transferStock({
        source_location: sourceLocation,
        destination_location: destinationLocation,
        variant,
        quantity: qty,
      });
      setResult(res);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(
        err instanceof ApiError && err.errors
          ? err.errors.non_field_errors?.[0] ??
              err.errors.quantity?.[0] ??
              err.errors.source_location?.[0] ??
              err.errors.destination_location?.[0] ??
              err.message
          : err instanceof Error
            ? err.message
            : "Failed to transfer stock",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form data-testid="stock-transfer-form" onSubmit={handleSubmit}>
      <select
        data-testid="stock-transfer-source"
        value={sourceLocation}
        onChange={(e) => setSourceLocation(e.target.value)}
      >
        <option value="">Select source</option>
        {(locations ?? []).map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <select
        data-testid="stock-transfer-destination"
        value={destinationLocation}
        onChange={(e) => setDestinationLocation(e.target.value)}
      >
        <option value="">Select destination</option>
        {(locations ?? []).map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <select
        data-testid="stock-transfer-variant"
        value={variant}
        onChange={(e) => setVariant(e.target.value)}
      >
        <option value="">Select variant</option>
      </select>
      <input
        type="text"
        data-testid="stock-transfer-quantity"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />
      <button
        type="submit"
        data-testid="stock-transfer-submit"
        disabled={submitting}
      >
        {submitting ? "…" : "Transfer"}
      </button>
      {error && <div data-testid="stock-transfer-error">{error}</div>}
      {result && (
        <div data-testid="stock-transfer-result">
          <div data-testid="stock-transfer-source-result">{result.source.location}</div>
          <div data-testid="stock-transfer-destination-result">{result.destination.location}</div>
          <div data-testid="stock-transfer-transferred-quantity">{result.transferred_quantity}</div>
        </div>
      )}
    </form>
  );
}