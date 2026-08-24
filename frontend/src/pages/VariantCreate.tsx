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
    <form data-testid="variant-create-form" onSubmit={handleSubmit} className="p-4 space-y-3">
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          data-testid="variant-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded px-2 py-1 w-full"
        />
        {fieldError && <div data-testid="variant-create-error" className="text-red-600">{fieldError}</div>}
        {serverError && <div data-testid="variant-create-error" className="text-red-600">{serverError}</div>}
      </div>
      <button
        type="submit"
        data-testid="variant-create-submit"
        disabled={submitting}
        className="bg-blue-600 text-white rounded px-3 py-1"
      >
        {submitting ? "…" : "Create variant"}
      </button>
    </form>
  );
}
