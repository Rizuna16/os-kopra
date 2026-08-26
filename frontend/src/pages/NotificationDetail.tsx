import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getNotification, markNotificationRead } from "../notifications/notificationService";
import type { Notification } from "../notifications/types";
import { ApiError } from "../auth/types";

export function NotificationDetail() {
  const { notificationId } = useParams();
  const { currentBusinessId } = useBusiness();
  const [item, setItem] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!currentBusinessId || !notificationId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getNotification(currentBusinessId, notificationId);
      setItem(data);
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : "Failed to load notification";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentBusinessId, notificationId]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const handleMarkRead = async () => {
    if (!currentBusinessId || !notificationId || !item) return;
    try {
      const res = await markNotificationRead(currentBusinessId, notificationId);
      setItem((prev) => (prev ? { ...prev, is_read: res.is_read } : null));
    } catch {
      /* ignore error */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">
              Notification details
            </h1>
            <div data-testid="notification-detail-loading" className="text-sm text-gray-500">
              Loading...
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">
              Notification details
            </h1>
            <div
              data-testid="notification-detail-error"
              className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4"
            >
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Notification details
            </h1>
            <Link
              to="/notifications"
              className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium text-sm rounded-xl transition-colors"
            >
              Back to notifications
            </Link>
          </div>

          <div data-testid="notification-detail" className="space-y-4 text-sm text-gray-700">
            <div>
              <span className="font-medium text-gray-500">ID:</span>{" "}
              <span data-testid="notification-detail-id" className="font-mono text-gray-900">
                {item.id}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Type:</span>{" "}
              <span data-testid="notification-detail-type" className="text-gray-900">
                {item.type}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Title:</span>{" "}
              <span data-testid="notification-detail-title" className="text-gray-900 font-semibold">
                {item.title}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Message:</span>{" "}
              <p data-testid="notification-detail-message" className="text-gray-900 mt-1">
                {item.message}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Is Read:</span>{" "}
              <span data-testid="notification-detail-isread" className="text-gray-900">
                {String(item.is_read)}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Created At:</span>{" "}
              <span data-testid="notification-detail-created" className="text-gray-900">
                {item.created_at}
              </span>
            </div>

            {!item.is_read && (
              <div className="pt-4 border-t border-gray-100">
                <button
                  type="button"
                  data-testid="mark-read-btn"
                  onClick={() => void handleMarkRead()}
                  className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                >
                  Mark as read
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
