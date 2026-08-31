import { useEffect, useState } from "react";
import { useBusiness } from "../business/BusinessContext";
import { getTaxSettings, updateTaxSettings } from "../settings/settingsService";
import type { TaxSettings } from "../settings/types";
import { ApiError } from "../auth/types";

export function SettingsTax() {
  const { currentBusinessId } = useBusiness();
  const [data, setData] = useState<TaxSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [taxRate, setTaxRate] = useState<number | string>(0);
  const [taxName, setTaxName] = useState("PPN");
  const [taxInclusive, setTaxInclusive] = useState(false);

  useEffect(() => {
    if (!currentBusinessId) return;
    setLoading(true);
    setError(null);
    getTaxSettings(currentBusinessId)
      .then((res) => {
        setData(res);
        setTaxRate(res.tax_rate ?? 0);
        setTaxName(res.tax_name || "PPN");
        setTaxInclusive(res.tax_inclusive ?? false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load tax settings");
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
      const updated = await updateTaxSettings(currentBusinessId, {
        tax_rate: Number(taxRate),
        tax_name: taxName,
        tax_inclusive: taxInclusive,
      });
      setData(updated);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save tax settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div data-testid="settings-tax-loading" className="p-6 text-gray-500">Loading tax settings...</div>;
  }

  return (
    <div data-testid="settings-tax-page" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Pengaturan Pajak</h2>
        <p className="text-sm text-gray-500 mt-1">Konfigurasi tarif dan jenis pajak penjualan.</p>
      </div>

      {error && <div data-testid="settings-tax-error" className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">{error}</div>}
      {success && <div data-testid="settings-tax-success" className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-200">Pengaturan pajak berhasil disimpan.</div>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama Pajak</label>
          <input
            type="text"
            data-testid="tax-name-input"
            value={taxName}
            onChange={(e) => setTaxName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tarif Pajak (%)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            data-testid="tax-rate-input"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="tax_inclusive"
            data-testid="tax-inclusive-input"
            checked={taxInclusive}
            onChange={(e) => setTaxInclusive(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
          />
          <label htmlFor="tax_inclusive" className="text-sm font-medium text-gray-700">Pajak sudah termasuk dalam harga (Tax Inclusive)</label>
        </div>

        <button
          type="submit"
          data-testid="save-tax-settings-btn"
          disabled={saving}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>
    </div>
  );
}
