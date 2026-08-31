import { useEffect, useState } from "react";
import { useBusiness } from "../business/BusinessContext";
import { getNotificationPreferences, updateNotificationPreferences } from "../settings/settingsService";
import type { NotificationPreferences } from "../settings/types";
import { ApiError } from "../auth/types";

export function SettingsNotificationPrefs() {
  const { currentBusinessId } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [stockAlerts, setStockAlerts] = useState(true);
  const [orderAlerts, setOrderAlerts] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(true);
  const [subscriptionAlerts, setSubscriptionAlerts] = useState(true);

  useEffect(() => {
    if (!currentBusinessId) return;
    setLoading(true);
    setError(null);
    getNotificationPreferences(currentBusinessId)
      .then((res) => {
        setStockAlerts(res.receive_stock_alerts ?? true);
        setOrderAlerts(res.receive_order_alerts ?? true);
        setPaymentAlerts(res.receive_payment_alerts ?? true);
        setSubscriptionAlerts(res.receive_subscription_alerts ?? true);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load notification preferences");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentBusinessId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusinessId) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateNotificationPreferences(currentBusinessId, {
        receive_stock_alerts: stockAlerts,
        receive_order_alerts: orderAlerts,
        receive_payment_alerts: paymentAlerts,
        receive_subscription_alerts: subscriptionAlerts,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save notification preferences");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div data-testid="settings-notifications-loading" className="p-6 text-gray-500">Loading notification preferences...</div>;
  }

  const Toggle = ({ label, value, onChange, testid }: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
    testid: string;
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        data-testid={testid}
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${
          value ? "bg-indigo-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );

  return (
    <div data-testid="settings-notifications-page" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Preferensi Notifikasi</h2>
        <p className="text-sm text-gray-500 mt-1">Atur jenis notifikasi yang ingin diterima.</p>
      </div>

      {error && <div data-testid="settings-notifications-error" className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">{error}</div>}
      {success && <div data-testid="settings-notifications-success" className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-200">Preferensi notifikasi berhasil disimpan.</div>}

      <form onSubmit={handleSubmit} className="max-w-lg">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <Toggle label="Notifikasi Stok" value={stockAlerts} onChange={setStockAlerts} testid="toggle-stock-alerts" />
          <Toggle label="Notifikasi Pesanan" value={orderAlerts} onChange={setOrderAlerts} testid="toggle-order-alerts" />
          <Toggle label="Notifikasi Pembayaran" value={paymentAlerts} onChange={setPaymentAlerts} testid="toggle-payment-alerts" />
          <Toggle label="Notifikasi Langganan" value={subscriptionAlerts} onChange={setSubscriptionAlerts} testid="toggle-subscription-alerts" />
        </div>

        <button
          type="submit"
          data-testid="save-notification-preferences-btn"
          disabled={saving}
          className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>
    </div>
  );
}
