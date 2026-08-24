import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getPromotion, updatePromotion } from "../promotion_loyalty/promotionLoyaltyService";
import type {
  Promotion,
  PromotionUpdatePayload,
  DiscountType,
  PromotionStatus,
  Applicability,
} from "../promotion_loyalty/types";
import { ApiError } from "../auth/types";

export function PromotionEdit() {
  const { promotionId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [item, setItem] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const discountValueRef = useRef<HTMLInputElement>(null);
  const validFromRef = useRef<HTMLInputElement>(null);
  const validToRef = useRef<HTMLInputElement>(null);
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [status, setStatus] = useState<PromotionStatus>("ACTIVE");
  const [applicability, setApplicability] = useState<Applicability>("BUSINESS_WIDE");
  const [targetProduct, setTargetProduct] = useState("");
  const [targetVariant, setTargetVariant] = useState("");

  useEffect(() => {
    if (!currentBusinessId || !promotionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPromotion(currentBusinessId, promotionId)
      .then((d) => {
        if (!cancelled) {
          setItem(d);
          setDiscountType(d.discount_type);
          setStatus(d.status);
          setApplicability(d.applicability);
          setTargetProduct(d.target_product ?? "");
          setTargetVariant(d.target_variant ?? "");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load promotion");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, promotionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId || !promotionId) return;
    const name = nameRef.current?.value ?? "";
    if (!name.trim()) {
      setError("Name must not be empty or whitespace only.");
      return;
    }
    setError(null);
    setLoading(true);
    const payload: PromotionUpdatePayload = {
      name,
      discount_type: discountType,
      discount_value: discountValueRef.current?.value ?? "",
      valid_from: validFromRef.current?.value ?? "",
      valid_to: validToRef.current?.value ?? "",
      status,
      applicability,
      target_product: applicability === "PRODUCT_VARIANT" && targetProduct.trim() ? targetProduct.trim() : null,
      target_variant: applicability === "PRODUCT_VARIANT" && targetVariant.trim() ? targetVariant.trim() : null,
    };
    try {
      await updatePromotion(currentBusinessId, promotionId, payload);
      navigate(`/promotions/${promotionId}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors) {
        const first =
          e.errors.name?.[0] ??
          e.errors.discount_value?.[0] ??
          e.errors.valid_from?.[0] ??
          e.errors.valid_to?.[0] ??
          e.errors.status?.[0] ??
          e.errors.applicability?.[0] ??
          e.errors.target_product?.[0] ??
          e.errors.target_variant?.[0] ??
          e.errors.non_field_errors?.[0];
        setError(first ?? e.message);
      } else {
        setError(e instanceof Error ? e.message : "Failed to update promotion");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div data-testid="promotion-edit-loading">Loading…</div>;
  if (error) return <div data-testid="promotion-edit-error">{error}</div>;
  if (!item) return <div data-testid="promotion-edit">Promotion not found.</div>;
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Edit promotion</h1>
      <form data-testid="promotion-edit-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="name" className="block">Name</label>
          <input
            id="name"
            type="text"
            data-testid="promotion-name-input"
            ref={nameRef}
            defaultValue={item.name}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label htmlFor="discount_type" className="block">Discount type</label>
          <select
            id="discount_type"
            data-testid="promotion-discount-type-input"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as DiscountType)}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="PERCENTAGE">PERCENTAGE</option>
            <option value="FIXED">FIXED</option>
          </select>
        </div>
        <div>
          <label htmlFor="discount_value" className="block">Discount value</label>
          <input
            id="discount_value"
            type="number"
            step="0.01"
            data-testid="promotion-discount-value-input"
            ref={discountValueRef}
            defaultValue={String(item.discount_value)}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label htmlFor="valid_from" className="block">Valid from</label>
          <input
            id="valid_from"
            type="datetime-local"
            data-testid="promotion-valid-from-input"
            ref={validFromRef}
            defaultValue={item.valid_from.slice(0, 16)}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label htmlFor="valid_to" className="block">Valid to</label>
          <input
            id="valid_to"
            type="datetime-local"
            data-testid="promotion-valid-to-input"
            ref={validToRef}
            defaultValue={item.valid_to.slice(0, 16)}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label htmlFor="status" className="block">Status</label>
          <select
            id="status"
            data-testid="promotion-status-input"
            value={status}
            onChange={(e) => setStatus(e.target.value as PromotionStatus)}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
        <div>
          <label htmlFor="applicability" className="block">Applicability</label>
          <select
            id="applicability"
            data-testid="promotion-applicability-input"
            value={applicability}
            onChange={(e) => setApplicability(e.target.value as Applicability)}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="BUSINESS_WIDE">BUSINESS_WIDE</option>
            <option value="PRODUCT_VARIANT">PRODUCT_VARIANT</option>
          </select>
        </div>
        {applicability === "PRODUCT_VARIANT" && (
          <>
            <div>
              <label htmlFor="target_product" className="block">Target product (UUID)</label>
              <input
                id="target_product"
                type="text"
                data-testid="promotion-target-product-input"
                value={targetProduct}
                onChange={(e) => setTargetProduct(e.target.value)}
                className="border rounded px-2 py-1 w-full"
              />
            </div>
            <div>
              <label htmlFor="target_variant" className="block">Target variant (UUID)</label>
              <input
                id="target_variant"
                type="text"
                data-testid="promotion-target-variant-input"
                value={targetVariant}
                onChange={(e) => setTargetVariant(e.target.value)}
                className="border rounded px-2 py-1 w-full"
              />
            </div>
          </>
        )}
        {error && <div data-testid="promotion-edit-error" className="text-red-600">{error}</div>}
        <button
          type="submit"
          data-testid="promotion-edit-submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded px-3 py-1"
        >
          {loading ? "…" : "Update promotion"}
        </button>
      </form>
    </div>
  );
}
