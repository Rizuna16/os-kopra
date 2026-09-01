import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getPublicStore,
  getPublicCatalog,
} from "../onlinestore/storefrontService";
import type { PublicProduct } from "../onlinestore/storefrontService";
import type { OnlineStoreSummary } from "../onlinestore/types";

export function Storefront() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<OnlineStoreSummary | null>(null);
  const [catalog, setCatalog] = useState<PublicProduct[]>([]);
  const [brandColor, setBrandColor] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getPublicStore(slug)
      .then((data) => {
        if (!cancelled) {
          setStore(data);
          setBrandColor(data.brand_color || null);
        }
        return getPublicCatalog(slug);
      })
      .then((prods) => {
        if (!cancelled) {
          setCatalog(Array.isArray(prods) ? prods : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Store not found");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-gray-50" data-testid="storefront">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div className="flex items-center gap-4 mb-4">
            {store && store.logo_url && (
              <img
                data-testid="storefront-logo"
                src={store.logo_url}
                alt={`${store.name} logo`}
                className="w-16 h-16 rounded-xl object-cover border border-gray-200"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Online Store: {store?.name ?? slug}
              </h1>
              {store && store.tagline && (
                <p data-testid="storefront-tagline" className="text-sm text-gray-600 mt-1">
                  {store.tagline}
                </p>
              )}
            </div>
          </div>
          {loading ? (
            <p className="text-gray-600" data-testid="storefront-loading">Loading store...</p>
          ) : error ? (
            <p className="text-red-600" data-testid="storefront-error">{error}</p>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Published products ({catalog.length})
              </p>
              {catalog.length === 0 ? (
                <p className="mt-4 text-gray-500">No published products.</p>
              ) : (
                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {catalog.map((product) => (
                    <div
                      key={product.id}
                      className="border border-gray-100 rounded-lg p-4"
                    >
                      <h2 className="text-lg font-semibold text-gray-900">
                        {product.name}
                      </h2>
                      <p className="text-sm text-gray-700 mt-1 price">
                        {product.price}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {Array.isArray(product.variants) &&
                          product.variants.map((variant) => (
                            <li
                              key={variant.id}
                              className="text-sm text-gray-600"
                            >
                              <span className="variant-name">{variant.name}</span> —{" "}
                              <span className="available">{variant.available}</span>{" "}
                              in stock
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6">
                <Link
                  to={`/store/${slug}/cart`}
                  className="inline-flex items-center px-4 py-2 text-white rounded-md hover:opacity-90"
                  style={{ backgroundColor: brandColor || "#4F46E5" }}
                >
                  View Cart
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
