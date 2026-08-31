import { useEffect, useState } from "react";
import { useBusiness } from "../business/BusinessContext";
import { getReceiptSettings, updateReceiptSettings } from "../settings/settingsService";
import type { ReceiptSettings } from "../settings/types";
import { ApiError } from "../auth/types";

export function SettingsReceipt() {
  const { currentBusinessId } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [receiptPrefix, setReceiptPrefix] = useState("RCT-");
  const [receiptNextNumber, setReceiptNextNumber] = useState<number | string>(1);
  const [receiptNotes, setReceiptNotes] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");

  useEffect(() => {
    if (!currentBusinessId) return;
    setLoading(true);
    setError(null);
    getReceiptSettings(currentBusinessId)
      .then((res) => {
        setReceiptPrefix(res.receipt_prefix || "RCT-");
        setReceiptNextNumber(res.receipt_next_number ?? 1);
        setReceiptNotes(res.receipt_notes || "");
        setReceiptFooter(res.receipt_footer || "");
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load receipt settings");
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
      await updateReceiptSettings(currentBusinessId, {
        receipt_prefix: receiptPrefix,
        receipt_next_number: Number(receiptNextNumber),
        receipt_notes: receiptNotes,
        receipt_footer: receiptFooter,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save receipt settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div data-testid="settings-receipt-loading" className="p-6 text-gray-500">Loading receipt settings...</div>;
  }

  return (
    <div data-testid="settings-receipt-page" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Pengaturan Struk</h2>
        <p className="text-sm text-gray-500 mt-1">Konfigurasi penomoran dan template struk pembayaran.</p>
      </div>

      {error && <div data-testid="settings-receipt-error" className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">{error}</div>}
      {success && <div data-testid="settings-receipt-success" className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-200">Pengaturan struk berhasil disimpan.</div>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Prefiks Struk</label>
          <input
            type="text"
            data-testid="receipt-prefix-input"
            value={receiptPrefix}
            onChange={(e) => setReceiptPrefix(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nomor Berikutnya</label>
          <input
            type="number"
            min="1"
            data-testid="receipt-next-number-input"
            value={receiptNextNumber}
            onChange={(e) => setReceiptNextNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Catatan Struk</label>
          <textarea
            data-testid="receipt-notes-input"
            value={receiptNotes}
            onChange={(e) => setReceiptNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Footer Struk</label>
          <textarea
            data-testid="receipt-footer-input"
            value={receiptFooter}
            onChange={(e) => setReceiptFooter(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
          />
        </div>

        <button
          type="submit"
          data-testid="save-receipt-settings-btn"
          disabled={saving}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>
    </div>
  );
}
