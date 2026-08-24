import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { createProduct } from "../product/productService";
import type { ProductPayload } from "../product/productService";
import { ApiError } from "../auth/types";

export function ProductCreate() {
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("55000.50");
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
      const payload: ProductPayload = { name, price };
      await createProduct(currentBusinessId!, payload);
      navigate("/products");
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors) {
        setServerError(e.errors.name?.[0] ?? e.message);
        if (e.errors.name) setFieldError(e.errors.name[0]);
      } else {
        setServerError(e instanceof Error ? e.message : "Failed to create product");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form data-testid="product-create-form" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          data-testid="product-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {fieldError && <div data-testid="product-create-error">{fieldError}</div>}
        {serverError && <div data-testid="product-create-error">{serverError}</div>}
      </div>
      <div>
        <label htmlFor="price">Price</label>
        <input
          id="price"
          type="text"
          data-testid="product-price-input"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <button
        type="submit"
        data-testid="product-create-submit"
        disabled={submitting}
      >
        {submitting ? "…" : "Create product"}
      </button>
    </form>
  );
}