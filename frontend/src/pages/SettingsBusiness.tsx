import { useEffect, useState } from "react";
import { useBusiness } from "../business/BusinessContext";
import { getBusinessSettings, updateBusinessSettings } from "../settings/settingsService";
import type { BusinessSettings } from "../settings/types";
import { ApiError } from "../auth/types";

export function SettingsBusiness() {
  const { currentBusinessId } = useBusiness();
  const [data, setData] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (!currentBusinessId) return;
    setLoading(true);
    setError(null);
    getBusinessSettings(currentBusinessId)
      .then((res) => {
        setData(res);
        setName(res.name || "");
        setLogoUrl(res.logo_url || "");
        setBrandColor(res.brand_color || "");
        setTagline(res.tagline || "");
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load business settings");
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
      const updated = await updateBusinessSettings(currentBusinessId, {
        name,
        logo_url: logoUrl || null,
        brand_color: brandColor || null,
        tagline: tagline || null,
      });
      setData(updated);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save business settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div data-testid="settings-business-loading" className="p-6 text-gray-500">
        Loading business settings...
      </div>
    );
  }

  return (
    <div data-testid="settings-business-page" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Pengaturan Bisnis</h2>
        <p className="text-sm text-gray-500 mt-1">Kelola identitas dan branding bisnis Anda.</p>
      </div>

      {error && (
        <div data-testid="settings-business-error" className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {success && (
        <div data-testid="settings-business-success" className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-200">
          Pengaturan bisnis berhasil disimpan.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama Bisnis</label>
          <input
            type="text"
            data-testid="business-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Logo URL</label>
          <input
            type="url"
            data-testid="business-logo-input"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {logoUrl && (
            <div className="mt-2">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Logo Preview</label>
              {!logoError ? (
                <img
                  data-testid="business-logo-preview"
                  src={logoUrl}
                  alt="Logo preview"
                  className="max-h-24 max-w-48 rounded-lg border border-gray-200"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div data-testid="business-logo-preview" className="w-24 h-24 rounded-lg border border-gray-300 bg-gray-100 flex items-center justify-center">
                  <span className="text-xs text-gray-500">Preview unavailable</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Warna Brand (Hex)</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              data-testid="business-color-picker"
              value={brandColor || "#4F46E5"}
              onChange={(e) => setBrandColor(e.target.value.toUpperCase())}
              className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer flex-shrink-0"
            />
            <input
              type="text"
              data-testid="business-color-input"
              value={brandColor}
              onChange={(e) => {
                const val = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                  setBrandColor(val.toUpperCase());
                }
              }}
              placeholder="#4F46E5"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              maxLength={7}
            />
            {brandColor && /^#[0-9A-Fa-f]{6}$/.test(brandColor) && (
              <div
                className="w-8 h-8 rounded-lg border border-gray-300 flex-shrink-0"
                style={{ backgroundColor: brandColor }}
              />
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tagline</label>
          <input
            type="text"
            data-testid="business-tagline-input"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Solusi retail terbaik"
            maxLength={255}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div data-testid="business-brand-preview-card" className="p-4 border border-gray-200 rounded-xl bg-white">
          <div className="text-xs font-bold text-gray-700 uppercase mb-2">Live Brand Preview</div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="h-3 rounded-t-lg" style={{ backgroundColor: brandColor || "#E5E7EB" }} />
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                {logoUrl && !logoError ? (
                  <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-cover" onError={() => setLogoError(true)} />
                ) : logoError ? (
                  <div className="w-12 h-12 rounded-lg border border-gray-300 bg-gray-100 flex items-center justify-center">
                    <span className="text-xs text-gray-500">Logo</span>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg border border-gray-300 bg-gray-100 flex items-center justify-center">
                    <span className="text-xs text-gray-500">Logo</span>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{name || "Nama Bisnis"}</h3>
                  <p className="text-sm text-gray-500">{tagline || "Tagline bisnis Anda"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          data-testid="save-business-settings-btn"
          disabled={saving}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>
    </div>
  );
}
