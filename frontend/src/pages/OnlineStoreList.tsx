import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { listOnlineStores } from "../onlinestore/onlineStoreService";
import type { OnlineStoreDetail } from "../onlinestore/types";

export function OnlineStoreList() {
  const { currentBusinessId } = useBusiness();
  const [stores, setStores] = useState<OnlineStoreDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId) return;
    setLoading(true);
    setError(null);
    listOnlineStores(currentBusinessId)
      .then((data) => {
        setStores(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load stores");
        setLoading(false);
      });
  }, [currentBusinessId]);

  if (loading) {
    return <div data-testid="store-list-loading" className="p-4">Loading stores...</div>;
  }

  if (error) {
    return (
      <div data-testid="store-list-error" className="p-4 text-red-600">
        {error}
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div data-testid="store-list-empty" className="p-4">
        <p className="text-gray-600 mb-4">No online stores found.</p>
        <Link
          to="/stores/create"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Create Online Store
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="store-list" className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Online Stores</h1>
        <Link
          to="/stores/create"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Create Online Store
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <div key={store.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">{store.name}</h2>
            <p className="text-sm text-gray-500 mb-4">{store.slug}</p>
            <div className="flex space-x-2">
              <Link
                to={`/stores/${store.id}/products`}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                Manage Products
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                to={`/stores/${store.slug}/orders`}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                Orders
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}