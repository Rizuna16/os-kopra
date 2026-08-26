import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { listNotifications, markNotificationRead } from "../notifications/notificationService";
import type { Notification } from "../notifications/types";
import { ApiError } from "../auth/types";

export function Notifications() {
  const { currentBusinessId } = useBusiness();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!currentBusinessId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listNotifications(currentBusinessId);
      setItems(data);
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : "Failed to load notifications";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentBusinessId]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const handleMarkRead = async (notificationId: string) => {
    if (!currentBusinessId) return;
    try {
      const res = await markNotificationRead(currentBusinessId, notificationId);
      setItems((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, is_read: res.is_read } : item
        )
      );
    } catch {
      /* ignore or handle error silently */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <div data-testid="notification-list-loading" className="text-sm text-gray-500">
              Loading notifications...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <div
              data-testid="notification-list-error"
              className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4"
            >
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Notifications</h1>
          </div>

          <div data-testid="notification-list">
            {items.length === 0 ? (
              <div data-testid="notification-list-empty" className="text-sm text-gray-500">
                No notifications found.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((item) => (
                  <li
                    key={item.id}
                    data-testid={`notification-item-${item.id}`}
                    data-isread={String(item.is_read)}
                    className={`py-4 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl transition-colors ${
                      item.is_read ? "bg-white" : "bg-blue-50/50"
                    }`}
                  >
                    <div className="space-y-1">
                      <Link
                        to={`/notifications/${item.id}`}
                        data-testid={`notification-link-${item.id}`}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {item.title}
                      </Link>
                      <p className="text-sm text-gray-600">{item.message}</p>
                      <span className="text-xs text-gray-400 block">{item.created_at}</span>
                    </div>

                    {!item.is_read && (
                      <button
                        type="button"
                        data-testid={`mark-read-btn-${item.id}`}
                        onClick={() => void handleMarkRead(item.id)}
                        className="py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-700 rounded-lg transition-colors self-start sm:self-center"
                      >
                        Mark as read
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
