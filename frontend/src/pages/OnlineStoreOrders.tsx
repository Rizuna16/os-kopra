import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { listOnlineOrders } from "../onlinestore/onlineStoreService";
import type { OnlineOrderDetail } from "../onlinestore/types";

export function OnlineStoreOrders() {
  const { slug } = useParams<{ slug: string }>();
  const [orders, setOrders] = useState<OnlineOrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    listOnlineOrders(slug)
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load orders");
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return <div data-testid="store-orders-loading" className="p-4">Loading orders...</div>;
  }

  if (error) {
    return <div data-testid="store-orders-error" className="p-4 text-red-600">{error}</div>;
  }

  if (orders.length === 0) {
    return <div data-testid="store-orders-empty" className="p-4">No orders found.</div>;
  }

  return (
    <div data-testid="store-orders-list" className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Store Orders</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-900">Order #{order.id.slice(0, 8)}</span>
              <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">
                {order.status}
              </span>
            </div>
            <p className="text-sm text-gray-600">Guest: <span>{order.guest_name}</span></p>
            <p className="text-sm text-gray-600">Address: <span>{order.shipping_address}</span></p>
          </div>
        ))}
      </div>
    </div>
  );
}