import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { createSale } from "../sales/saleService";
import type { SalePayload, SaleStatus } from "../sales/types";
import { listLocations } from "../business/businessService";
import type { LocationSummary } from "../business/types";
import { listProducts } from "../product/productService";
import type { Product } from "../product/types";
import { listVariants } from "../product/variantService";
import type { Variant } from "../product/variantTypes";
import { ApiError } from "../auth/types";

interface LineDraft {
  variant: string;
  quantity: string;
  unit_price: string;
}

export function SaleCreate() {
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<SaleStatus>("DRAFT");
  const [lines, setLines] = useState<LineDraft[]>([
    { variant: "", quantity: "", unit_price: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [allVariants, setAllVariants] = useState<Variant[]>([]);

  useEffect(() => {
    if (!currentBusinessId) return;
    let cancelled = false;
    Promise.all([
      listLocations(currentBusinessId).catch(() => []),
      listProducts(currentBusinessId)
        .then((products: Product[]) => {
          if (cancelled) return [];
          return Promise.all(
            products.map((p) =>
              listVariants(currentBusinessId!, p.id).catch(() => []),
            ),
          );
        })
        .then((v) => (cancelled ? [] : v.flat()))
        .catch(() => []),
    ]).then(([l, v]) => {
      if (cancelled) return;
      setLocations(Array.isArray(l) ? l : []);
      setAllVariants(Array.isArray(v) ? v : []);
    });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId]);

  const updateLine = (idx: number, field: keyof LineDraft, val: string) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: val } : l)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { variant: "", quantity: "", unit_price: "" }]);
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId) return;
    if (!location) {
      setError("Location is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
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
      await createSale(currentBusinessId, payload);
      navigate("/sales");
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors) {
        setError(Object.values(e.errors).flat().join(", "));
      } else {
        setError(e instanceof Error ? e.message : "Failed to create sale");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Create Sale</h1>
          <form data-testid="sale-create-form" onSubmit={handleSubmit}>
            {error && (
              <div data-testid="sale-create-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4 mb-6">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="sale-location" className="text-sm font-medium text-gray-700 block mb-1">Location</label>
                <select
                  id="sale-location"
                  data-testid="sale-location-select"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                >
                  <option value="">Select location</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="sale-status" className="text-sm font-medium text-gray-700 block mb-1">Status</label>
                <select
                  id="sale-status"
                  data-testid="sale-status-select"
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
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">Lines</span>
                  <button
                    type="button"
                    data-testid="sale-add-line-button"
                    onClick={addLine}
                    className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm rounded-xl transition-colors"
                  >
                    Add line
                  </button>
                </div>
                {lines.map((line, idx) => (
                  <div key={idx} data-testid={`sale-line-${idx}`} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl relative">
                    <div className="sm:col-span-2">
                      <select
                        data-testid="sale-line-variant-select"
                        value={line.variant}
                        onChange={(e) => updateLine(idx, "variant", e.target.value)}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      >
                        <option value="">Select variant</option>
                        {allVariants.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        data-testid="sale-line-quantity-input"
                        type="text"
                        placeholder="Qty"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        data-testid="sale-line-unit-price-input"
                        type="text"
                        placeholder="Unit price"
                        value={line.unit_price}
                        onChange={(e) => updateLine(idx, "unit_price", e.target.value)}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      />
                      {lines.length > 1 && (
                        <button
                          type="button"
                          data-testid="sale-remove-line-button"
                          onClick={() => removeLine(idx)}
                          className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  data-testid="sale-create-submit"
                  disabled={submitting}
                  className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "…" : "Create sale"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
