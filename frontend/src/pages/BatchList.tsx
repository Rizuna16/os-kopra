import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import {
  listBatches,
  createBatch,
} from "../inventory/inventoryService";
import type { Batch } from "../inventory/types";
import { ApiError } from "../auth/types";

export function BatchList() {
  const { currentLocationId } = useBusiness();
  const navigate = useNavigate();
  const [items, setItems] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("BATCH-001");
  const [variant, setVariant] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiredDate, setExpiredDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = () => {
    if (!currentLocationId) return;
    setLoading(true);
    setError(null);
    listBatches()
      .then(setItems)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setError(e instanceof ApiError ? e.message : "Failed to load batches");
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [currentLocationId, navigate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setSubmitting(true);
    try {
      await createBatch({
        code,
        location: currentLocationId ?? "",
        variant,
        quantity: quantity === "" ? 0 : Number(quantity),
        expired_date: expiredDate ? expiredDate : null,
      });
      setCode("BATCH-001");
      setVariant("");
      setQuantity("");
      setExpiredDate("");
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setCreateError(
        err instanceof ApiError && err.errors?.code
          ? err.errors.code[0]
          : err instanceof Error
            ? err.message
            : "Failed to create batch",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div data-testid="batch-list-loading">Loading…</div>;
  if (error) return <div data-testid="batch-list-error">{error}</div>;
  return (
    <div data-testid="batch-list">
      <form data-testid="batch-create-form" onSubmit={handleCreate}>
        <input
          type="text"
          data-testid="batch-code-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <select
          data-testid="batch-variant-input"
          value={variant}
          onChange={(e) => setVariant(e.target.value)}
        >
          <option value="">Select variant</option>
        </select>
        <input
          type="text"
          data-testid="batch-quantity-input"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <input
          type="date"
          data-testid="batch-expired-date-input"
          value={expiredDate}
          onChange={(e) => setExpiredDate(e.target.value)}
        />
        <button
          type="submit"
          data-testid="batch-create-submit"
          disabled={submitting}
        >
          {submitting ? "…" : "Create batch"}
        </button>
        {createError && <div data-testid="batch-create-error">{createError}</div>}
      </form>
      {items.length === 0 ? (
        <div data-testid="batch-list-empty">No batches.</div>
      ) : (
        <ul>
          {items.map((b) => (
            <li key={b.id} data-testid={`batch-item-${b.id}`}>
              <span data-testid="batch-code">{b.code}</span>
              <span data-testid="batch-quantity">{b.quantity}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}