import { useEffect, useState } from "react";
import { useBusiness } from "../business/BusinessContext";
import { getCurrencySettings, updateCurrencySettings } from "../settings/settingsService";
import type { CurrencySettings } from "../settings/types";
import { ApiError } from "../auth/types";

export function SettingsCurrency() {
  const { currentBusinessId } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [currencyCode, setCurrencyCode] = useState("IDR");
  const [currencySymbol, setCurrencySymbol] = useState("Rp");
  const [decimalPlaces, setDecimalPlaces] = useState<number | string>(0);

  useEffect(() => {
    if (!currentBusinessId) return;
    setLoading(true);
    setError(null);
    getCurrencySettings(currentBusinessId)
      .then((res) => {
        setCurrencyCode(res.currency_code || "IDR");
        setCurrencySymbol(res.currency_symbol || "Rp");
        setDecimalPlaces(res.decimal_places ?? 0);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load currency settings");
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
      await updateCurrencySettings(currentBusinessId, {
        currency_code: currencyCode,
        currency_symbol: currencySymbol,
        decimal_places: Number(decimalPlaces),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save currency settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div data-testid="settings-currency-loading" className="p-6 text-gray-500">Loading currency settings...</div>;
  }

  return (
    <div data-testid="settings-currency-page" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Pengaturan Mata Uang</h2>
        <p className="text-sm text-gray-500 mt-1">Konfigurasi mata uang dan simbol transaksi Anda.</p>
      </div>

      {error && <div data-testid="settings-currency-error" className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">{error}</div>}
      {success && <div data-testid="settings-currency-success" className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-200">Pengaturan mata uang berhasil disimpan.</div>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Kode Mata Uang (ISO 4217)</label>
          <input
            type="text"
            data-testid="currency-code-input"
            value={currencyCode}
            onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
            maxLength={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Simbol Mata Uang</label>
          <input
            type="text"
            data-testid="currency-symbol-input"
            value={currencySymbol}
            onChange={(e) => setCurrencySymbol(e.target.value)}
            maxLength={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Desimal</label>
          <input
            type="number"
            min="0"
            max="4"
            data-testid="currency-decimal-input"
            value={decimalPlaces}
            onChange={(e) => setDecimalPlaces(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            required
          />
          <p className="text-[10px] text-gray-400 mt-1">Jumlah angka di belakang koma (0-4).</p>
        </div>

        <button
          type="submit"
          data-testid="save-currency-settings-btn"
          disabled={saving}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>
    </div>
  );
}
