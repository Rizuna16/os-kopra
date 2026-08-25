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

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit Variant</h1>
            <div data-testid="variant-edit-loading">Loading…</div>
          </div>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit Variant</h1>
            <div data-testid="variant-edit-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">{error}</div>
          </div>
        </div>
      </div>
    );
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit Variant</h1>
          <form data-testid="variant-edit-form" onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-700">Name</label>
              <input
                id="name"
                type="text"
                data-testid="variant-name-input"
                ref={nameRef}
                defaultValue={name}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
              {fieldError && <div data-testid="variant-edit-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">{fieldError}</div>}
              {serverError && <div data-testid="variant-edit-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">{serverError}</div>}
            </div>
            <button
              type="submit"
              data-testid="variant-edit-submit"
              disabled={submitting}
              className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "…" : "Save variant"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
