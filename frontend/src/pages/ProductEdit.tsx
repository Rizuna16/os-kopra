import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getProduct, updateProduct } from "../product/productService";
import type { ProductPayload } from "../product/productService";
import type { Product } from "../product/types";
import { ApiError } from "../auth/types";

export function ProductEdit() {
  const { productId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [item, setItem] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId || !productId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProduct(currentBusinessId, productId)
      .then((d) => {
        if (!cancelled) {
          setItem(d);
          setName(d.name);
          setPrice(String(d.price));
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load product");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId || !productId) return;
    setError(null);
    setLoading(true);
    try {
      const payload: ProductPayload = { name, price };
      await updateProduct(currentBusinessId, productId, payload);
      navigate(`/products/${productId}`);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.errors ? Object.values(e.errors).flat().join(", ") : e.message);
      } else {
        setError(e instanceof Error ? e.message : "Failed to update product");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div data-testid="product-edit-loading">Loading…</div>;
  if (error) return <div data-testid="product-edit-error">{error}</div>;
  if (!item) return <div data-testid="product-edit">Product not found.</div>;
  return (
    <form data-testid="product-edit-form" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          data-testid="product-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
        data-testid="product-edit-submit"
        disabled={loading}
      >
        {loading ? "…" : "Update product"}
      </button>
    </form>
  );
}