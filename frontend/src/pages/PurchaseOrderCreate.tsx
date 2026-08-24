import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { createPurchaseOrder } from "../purchasing/purchasingService";
import type { PurchaseOrderPayload, PurchaseOrderStatus } from "../purchasing/types";
import { listSuppliers } from "../supplier/supplierService";
import type { Supplier } from "../supplier/types";
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

export function PurchaseOrderCreate() {
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<PurchaseOrderStatus>("DRAFT");
  const [lines, setLines] = useState<LineDraft[]>([
    { variant: "", quantity: "", unit_price: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [allVariants, setAllVariants] = useState<Variant[]>([]);

  useEffect(() => {
    if (!currentBusinessId) return;
    let cancelled = false;
    Promise.all([
      listSuppliers(currentBusinessId).catch(() => []),
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
    ]).then(([s, l, v]) => {
      if (cancelled) return;
      setSuppliers(Array.isArray(s) ? s : []);
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
    if (!supplier) {
      setError("Supplier is required.");
      return;
    }
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
      const payload: PurchaseOrderPayload = {
        supplier,
        location,
        status,
      };
      if (cleanLines.length > 0) payload.lines = cleanLines;
      await createPurchaseOrder(currentBusinessId, payload);
      navigate("/purchasing");
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors) {
        setError(Object.values(e.errors).flat().join(", "));
      } else {
        setError(e instanceof Error ? e.message : "Failed to create purchase order");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form data-testid="purchase-order-create-form" onSubmit={handleSubmit}>
      {error && <div data-testid="purchase-order-create-error">{error}</div>}
      <div className="space-y-4">
        <div>
          <label htmlFor="po-supplier">Supplier</label>
          <select
            id="po-supplier"
            data-testid="purchase-order-supplier-select"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          >
            <option value="">Select supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="po-location">Location</label>
          <select
            id="po-location"
            data-testid="purchase-order-location-select"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">Select location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="po-status">Status</label>
          <select
            id="po-status"
            data-testid="purchase-order-status-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)}
          >
            <option value="DRAFT">DRAFT</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold">Lines</span>
            <button type="button" data-testid="purchase-order-add-line-button" onClick={addLine}>
              Add line
            </button>
          </div>
          {lines.map((line, idx) => (
            <div key={idx} data-testid={`purchase-order-line-${idx}`}>
              <select
                data-testid="purchase-order-line-variant-select"
                value={line.variant}
                onChange={(e) => updateLine(idx, "variant", e.target.value)}
              >
                <option value="">Select variant</option>
                {allVariants.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <input
                data-testid="purchase-order-line-quantity-input"
                type="text"
                placeholder="Qty"
                value={line.quantity}
                onChange={(e) => updateLine(idx, "quantity", e.target.value)}
              />
              <input
                data-testid="purchase-order-line-unit-price-input"
                type="text"
                placeholder="Unit price"
                value={line.unit_price}
                onChange={(e) => updateLine(idx, "unit_price", e.target.value)}
              />
              {lines.length > 1 && (
                <button type="button" data-testid="purchase-order-remove-line-button" onClick={() => removeLine(idx)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="submit" data-testid="purchase-order-create-submit" disabled={submitting}>
          {submitting ? "…" : "Create purchase order"}
        </button>
      </div>
    </form>
  );
}
