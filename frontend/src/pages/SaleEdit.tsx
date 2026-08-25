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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div data-testid="sale-edit-loading" className="text-sm text-gray-500 py-8 text-center">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div data-testid="sale-edit-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">{error}</div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <div data-testid="sale-edit" className="text-sm text-gray-500">Sale not found.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Edit Sale</h1>
          <form data-testid="sale-edit-form" onSubmit={handleSubmit}>
            {error && (
              <div data-testid="sale-edit-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4 mb-6">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="sale-edit-location" className="text-sm font-medium text-gray-700 block mb-1">Location</label>
                <select
                  id="sale-edit-location"
                  data-testid="sale-edit-location-select"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                >
                  <option value={location}>{location}</option>
                </select>
              </div>
              <div>
                <label htmlFor="sale-edit-status" className="text-sm font-medium text-gray-700 block mb-1">Status</label>
                <select
                  id="sale-edit-status"
                  data-testid="sale-edit-status-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SaleStatus)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="VOIDED">VOIDED</option>
                </select>
              </div>
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <span className="text-lg font-bold text-gray-900 block">Lines</span>
                {lines.map((line, idx) => (
                  <div key={idx} data-testid={`sale-edit-line-${idx}`} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl">
                    <input
                      data-testid="sale-edit-line-variant-select"
                      type="text"
                      value={line.variant}
                      onChange={(e) => updateLine(idx, "variant", e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                    <input
                      data-testid="sale-edit-line-quantity-input"
                      type="text"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                    <input
                      data-testid="sale-edit-line-unit-price-input"
                      type="text"
                      value={line.unit_price}
                      onChange={(e) => updateLine(idx, "unit_price", e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                  </div>
                ))}
              </div>
              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  data-testid="sale-edit-submit"
                  disabled={loading}
                  className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "…" : "Update sale"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}