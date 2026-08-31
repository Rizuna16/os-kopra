import { useEffect, useState } from "react";
import { useBusiness } from "../business/BusinessContext";
import { getIntegrationSettings, updateIntegrationSettings } from "../settings/settingsService";
import type { IntegrationSettings } from "../settings/types";
import { ApiError } from "../auth/types";

export function SettingsIntegration() {
  const { currentBusinessId } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [storefrontUrl, setStorefrontUrl] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [apiDocsUrl, setApiDocsUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId) return;
    setLoading(true);
    setError(null);
    getIntegrationSettings(currentBusinessId)
      .then((res) => {
        setStorefrontUrl(res.storefront_url || null);
        setWebhookUrl(res.webhook_url || null);
        setApiDocsUrl(res.api_docs_url || null);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load integration settings");
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
      await updateIntegrationSettings(currentBusinessId, {
        webhook_url: webhookUrl || null,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save integration settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div data-testid="settings-integration-loading" className="p-6 text-gray-500">Loading integration settings...</div>;
  }

  return (
    <div data-testid="settings-integration-page" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Pengaturan Integrasi</h2>
        <p className="text-sm text-gray-500 mt-1">Konfigurasi URL toko dan webhook integrasi.</p>
      </div>

      {error && <div data-testid="settings-integration-error" className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">{error}</div>}
      {success && <div data-testid="settings-integration-success" className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-200">Pengaturan integrasi berhasil disimpan.</div>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Storefront URL (Read-only)</label>
          <input
            type="text"
            data-testid="storefront-url-input"
            value={storefrontUrl || ""}
            readOnly
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Webhook URL</label>
          <input
            type="url"
            data-testid="webhook-url-input"
            value={webhookUrl || ""}
            onChange={(e) => setWebhookUrl(e.target.value || null)}
            placeholder="https://example.com/webhook"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">API Docs URL (Read-only)</label>
          <input
            type="url"
            data-testid="api-docs-url-input"
            value={apiDocsUrl || ""}
            readOnly
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500"
          />
        </div>

        <button
          type="submit"
          data-testid="save-integration-settings-btn"
          disabled={saving}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>
    </div>
  );
}
