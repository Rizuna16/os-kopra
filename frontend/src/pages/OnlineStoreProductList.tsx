import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import {
  listOnlineStoreProducts,
  publishProductToOnlineStore,
  updateProductPublishingStatus,
} from "../onlinestore/onlineStoreService";
import { listProducts } from "../product/productService";
import type { OnlineStoreProductDetail } from "../onlinestore/types";
import type { Product } from "../product/types";

export function OnlineStoreProductList() {
  const { storeId } = useParams<{ storeId: string }>();
  const { currentBusinessId } = useBusiness();
  const [products, setProducts] = useState<Product[]>([]);
  const [publishings, setPublishings] = useState<OnlineStoreProductDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId || !storeId) return;
    setError(null);
    setLoading(true);
    Promise.all([
      listProducts(currentBusinessId),
      listOnlineStoreProducts(currentBusinessId, storeId),
    ])
      .then(([prods, pubs]) => {
        setProducts(prods);
        setPublishings(pubs);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load products");
        setLoading(false);
      });
  }, [currentBusinessId, storeId]);

  const getPublishing = (productId: string) => {
    return publishings.find((p) => p.product === productId);
  };

  const handleToggle = async (product: Product) => {
    if (!storeId || !currentBusinessId || !product.id) return;
    const current = getPublishing(product.id);
    const currentlyPublished = current?.is_published ?? false;
    setToggling(product.id);
    try {
      let updated: OnlineStoreProductDetail;
      if (!current) {
        updated = await publishProductToOnlineStore(currentBusinessId, storeId, {
          product: product.id,
          is_published: true,
        });
      } else {
        updated = await updateProductPublishingStatus(
          currentBusinessId,
          storeId,
          product.id,
          { is_published: !currentlyPublished }
        );
      }
      setPublishings((prev) =>
        prev.filter((p) => p.product !== product.id).concat([updated])
      );
    } catch (err: any) {
      setError(err.message || "Failed to update publishing");
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return <div data-testid="store-product-loading" className="p-4">Loading...</div>;
  }

  if (error) {
    return (
      <div data-testid="store-product-error" className="p-4 text-red-600">
        {error}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div data-testid="store-product-empty" className="p-4">
        <p className="text-gray-600">No products found.</p>
      </div>
    );
  }

  return (
    <div data-testid="store-product-list" className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Products for Store</h1>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="pb-3 text-sm font-medium text-gray-700">Product</th>
            <th className="pb-3 text-sm font-medium text-gray-700">Published</th>
            <th className="pb-3 text-sm font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const pub = getPublishing(product.id);
            const published = pub?.is_published ?? false;
            return (
              <tr key={product.id} className="border-b border-gray-100">
                <td className="py-3 text-gray-900">{product.name}</td>
                <td className="py-3">{published ? "Yes" : "No"}</td>
                <td className="py-3">
                  <button
                    data-testid={`publish-toggle-${product.id}`}
                    onClick={() => handleToggle(product)}
                    disabled={toggling === product.id}
                    className={`px-3 py-1 rounded text-sm font-medium text-white ${
                      published ? "bg-orange-600 hover:bg-orange-700" : "bg-indigo-600 hover:bg-indigo-700"
                    } disabled:opacity-50`}
                  >
                    {toggling === product.id
                      ? "Saving..."
                      : published
                      ? "Unpublish"
                      : "Publish"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}