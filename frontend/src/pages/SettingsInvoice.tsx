import { useEffect, useState } from "react";
import { useBusiness } from "../business/BusinessContext";
import { getInvoiceSettings, updateInvoiceSettings } from "../settings/settingsService";
import type { InvoiceSettings } from "../settings/types";
import { ApiError } from "../auth/types";

export function SettingsInvoice() {
  const { currentBusinessId } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [invoiceNextNumber, setInvoiceNextNumber] = useState<number | string>(1);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [invoiceFooter, setInvoiceFooter] = useState("");

  useEffect(() => {
    if (!currentBusinessId) return;
    setLoading(true);
    setError(null);
    getInvoiceSettings(currentBusinessId)
      .then((res) => {
        setInvoicePrefix(res.invoice_prefix || "INV-");
        setInvoiceNextNumber(res.invoice_next_number ?? 1);
        setInvoiceNotes(res.invoice_notes || "");
        setInvoiceFooter(res.invoice_footer || "");
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load invoice settings");
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
      await updateInvoiceSettings(currentBusinessId, {
        invoice_prefix: invoicePrefix,
        invoice_next_number: Number(invoiceNextNumber),
        invoice_notes: invoiceNotes,
        invoice_footer: invoiceFooter,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save invoice settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div data-testid="settings-invoice-loading" className="p-6 text-gray-500">Loading invoice settings...</div>;
  }

  return (
    <div data-testid="settings-invoice-page" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Pengaturan Faktur</h2>
        <p className="text-sm text-gray-500 mt-1">Konfigurasi penomoran dan template faktur penjualan.</p>
      </div>

      {error && <div data-testid="settings-invoice-error" className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">{error}</div>}
      {success && <div data-testid="settings-invoice-success" className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-200">Pengaturan faktur berhasil disimpan.</div>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Prefiks Faktur</label>
          <input
            type="text"
            data-testid="invoice-prefix-input"
            value={invoicePrefix}
            onChange={(e) => setInvoicePrefix(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nomor Berikutnya</label>
          <input
            type="number"
            min="1"
            data-testid="invoice-next-number-input"
            value={invoiceNextNumber}
            onChange={(e) => setInvoiceNextNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Catatan Faktur</label>
          <textarea
            data-testid="invoice-notes-input"
            value={invoiceNotes}
            onChange={(e) => setInvoiceNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Footer Faktur</label>
          <textarea
            data-testid="invoice-footer-input"
            value={invoiceFooter}
            onChange={(e) => setInvoiceFooter(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
          />
        </div>

        <button
          type="submit"
          data-testid="save-invoice-settings-btn"
          disabled={saving}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>
    </div>
  );
}
