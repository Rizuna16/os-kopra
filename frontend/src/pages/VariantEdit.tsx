import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getVariant, updateVariant } from "../product/variantService";
import type { VariantPayload } from "../product/variantTypes";
import { ApiError } from "../auth/types";

export function VariantEdit() {
  const { productId, variantId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentBusinessId || !productId || !variantId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getVariant(currentBusinessId, productId, variantId)
      .then((d) => {
        if (!cancelled) setName(d.name);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load variant");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, productId, variantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId || !productId || !variantId) return;
    const currentName = nameRef.current?.value ?? "";
    if (!currentName.trim()) {
      setFieldError("Name must not be empty or whitespace only.");
      return;
    } else {
      setFieldError(null);
    }
    setServerError(null);
    setSubmitting(true);
    try {
      const payload: VariantPayload = { name: currentName };
      await updateVariant(currentBusinessId, productId, variantId, payload);
      navigate(`/products/${productId}/variants`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors) {
        setServerError(e.errors.name?.[0] ?? e.message);
        if (e.errors.name) setFieldError(e.errors.name[0]);
      } else {
        setServerError(e instanceof Error ? e.message : "Failed to update variant");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div data-testid="variant-edit-loading">Loading…</div>;
  if (error) return <div data-testid="variant-edit-error">{error}</div>;
  return (
    <form data-testid="variant-edit-form" onSubmit={handleSubmit} className="p-4 space-y-3">
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          data-testid="variant-name-input"
          ref={nameRef}
          defaultValue={name}
          className="border rounded px-2 py-1 w-full"
        />
        {fieldError && <div data-testid="variant-edit-error" className="text-red-600">{fieldError}</div>}
        {serverError && <div data-testid="variant-edit-error" className="text-red-600">{serverError}</div>}
      </div>
      <button
        type="submit"
        data-testid="variant-edit-submit"
        disabled={submitting}
        className="bg-blue-600 text-white rounded px-3 py-1"
      >
        {submitting ? "…" : "Save variant"}
      </button>
    </form>
  );
}
