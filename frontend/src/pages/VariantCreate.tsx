import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { createVariant } from "../product/variantService";
import type { VariantPayload } from "../product/variantTypes";
import { ApiError } from "../auth/types";

export function VariantCreate() {
  const { productId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFieldError("Name must not be empty or whitespace only.");
      return;
    } else {
      setFieldError(null);
    }
    setServerError(null);
    setSubmitting(true);
    try {
      const payload: VariantPayload = { name };
      await createVariant(currentBusinessId!, productId!, payload);
      navigate(`/products/${productId}/variants`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors) {
        setServerError(e.errors.name?.[0] ?? e.message);
        if (e.errors.name) setFieldError(e.errors.name[0]);
      } else {
        setServerError(e instanceof Error ? e.message : "Failed to create variant");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create Variant</h1>
          <form data-testid="variant-create-form" onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-700">Name</label>
              <input
                id="name"
                type="text"
                data-testid="variant-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
              {fieldError && <div data-testid="variant-create-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">{fieldError}</div>}
              {serverError && <div data-testid="variant-create-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">{serverError}</div>}
            </div>
            <button
              type="submit"
              data-testid="variant-create-submit"
              disabled={submitting}
              className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "…" : "Create variant"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
