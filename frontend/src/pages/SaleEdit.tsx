import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getSale, updateSale } from "../sales/saleService";
import type {
  Sale,
  SalePayload,
  SaleStatus,
} from "../sales/types";
import { ApiError } from "../auth/types";

interface LineDraft {
  variant: string;
  quantity: string;
  unit_price: string;
}

export function SaleEdit() {
  const { saleId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [item, setItem] = useState<Sale | null>(null);
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<SaleStatus>("DRAFT");
  const [lines, setLines] = useState<LineDraft[]>([
    { variant: "", quantity: "", unit_price: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId || !saleId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSale(currentBusinessId, saleId)
      .then((d) => {
        if (!cancelled) {
          setItem(d);
          setLocation(d.location);
          setStatus(d.status);
          setLines(
            d.lines.length > 0
              ? d.lines.map((l) => ({
                  variant: l.variant,
                  quantity: String(l.quantity),
                  unit_price: String(l.unit_price),
                }))
              : [{ variant: "", quantity: "", unit_price: "" }],
          );
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load sale");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, saleId]);

  const updateLine = (idx: number, field: keyof LineDraft, val: string) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: val } : l)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId || !saleId) return;
    if (!location) {
      setError("Location is required.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const cleanLines = lines
        .filter((l) => l.variant)
        .map((l) => ({
          variant: l.variant,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
        }));
      const payload: SalePayload = {
        location,
        status,
      };
      if (cleanLines.length > 0) payload.lines = cleanLines;
      await updateSale(currentBusinessId, saleId, payload);
      navigate(`/sales/${saleId}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors) {
        setError(Object.values(e.errors).flat().join(", "));
      } else {
        setError(e instanceof Error ? e.message : "Failed to update sale");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div data-testid="sale-edit-loading">Loading…</div>;
  if (error) return <div data-testid="sale-edit-error">{error}</div>;
  if (!item) return <div data-testid="sale-edit">Sale not found.</div>;
  return (
    <form data-testid="sale-edit-form" onSubmit={handleSubmit}>
      {error && <div data-testid="sale-edit-error">{error}</div>}
      <div className="space-y-4">
        <div>
          <label htmlFor="sale-edit-location">Location</label>
          <select
            id="sale-edit-location"
            data-testid="sale-edit-location-select"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value={location}>{location}</option>
          </select>
        </div>
        <div>
          <label htmlFor="sale-edit-status">Status</label>
          <select
            id="sale-edit-status"
            data-testid="sale-edit-status-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as SaleStatus)}
          >
            <option value="DRAFT">DRAFT</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="VOIDED">VOIDED</option>
          </select>
        </div>
        <div className="space-y-3">
          {lines.map((line, idx) => (
            <div key={idx} data-testid={`sale-edit-line-${idx}`}>
              <input
                data-testid="sale-edit-line-variant-select"
                type="text"
                value={line.variant}
                onChange={(e) => updateLine(idx, "variant", e.target.value)}
              />
              <input
                data-testid="sale-edit-line-quantity-input"
                type="text"
                value={line.quantity}
                onChange={(e) => updateLine(idx, "quantity", e.target.value)}
              />
              <input
                data-testid="sale-edit-line-unit-price-input"
                type="text"
                value={line.unit_price}
                onChange={(e) => updateLine(idx, "unit_price", e.target.value)}
              />
            </div>
          ))}
        </div>
        <button type="submit" data-testid="sale-edit-submit" disabled={loading}>
          {loading ? "…" : "Update sale"}
        </button>
      </div>
    </form>
  );
}
