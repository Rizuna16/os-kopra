import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { useAuth } from "../auth/AuthContext";
import {
  getPayable,
  payPayable,
  reverseSupplierPayment,
  closePayable,
} from "../payable/payableService";
import type { Payable, PaymentMethodChoice } from "../payable/types";
import { ApiError } from "../auth/types";

function formatRupiah(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "Rp0,00";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function PayableDetail() {
  const { payableId } = useParams<{ payableId: string }>();
  const { currentBusinessId, currentLocationId } = useBusiness();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [item, setItem] = useState<Payable | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethodChoice>("CASH");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const [showReverseModal, setShowReverseModal] = useState(false);
  const [targetPaymentId, setTargetPaymentId] = useState("");
  const [reversalReason, setReversalReason] = useState("");
  const [revSubmitting, setRevSubmitting] = useState(false);
  const [revError, setRevError] = useState<string | null>(null);

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeNotes, setCloseNotes] = useState("");
  const [closeSubmitting, setCloseSubmitting] = useState(false);

  const role = (user as unknown as { role?: string })?.role?.toUpperCase() || (user?.email?.includes("admin") ? "ADMIN" : "OWNER");
  const isOwner = role === "OWNER" || !user?.email?.includes("admin");

  const loadData = () => {
    if (!currentBusinessId || !payableId) return;
    setLoading(true);
    setError(null);
    getPayable(currentBusinessId, payableId, currentLocationId || undefined)
      .then((data) => {
        if (data && (data as unknown as { error?: boolean }).error) {
          setError("Payable not found.");
          setItem(null);
        } else {
          setItem(data);
        }
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        const msg = e instanceof ApiError ? e.message : "Failed to load payable detail.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusinessId, payableId, currentLocationId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div data-testid="detail-loading" className="text-gray-500 font-medium">Memuat detail hutang…</div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div data-testid="detail-error" className="max-w-3xl mx-auto bg-red-50 p-4 rounded-2xl border border-red-100 text-red-600 text-sm">
          {error || "Payable not found."}
        </div>
      </div>
    );
  }

  const isTerminal = item.status === "PAID" || item.status === "CLOSED" || item.status === "VOIDED";

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId || !payableId) return;
    setPayError(null);

    const amountNum = parseFloat(payAmount);
    const outstandingNum = parseFloat(item.outstanding_amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      setPayError("Payment amount must be greater than zero.");
      return;
    }

    if (amountNum > outstandingNum) {
      setPayError("Payment amount exceeds current outstanding balance.");
      return;
    }

    setPaySubmitting(true);
    try {
      await payPayable(currentBusinessId, payableId, {
        amount: payAmount,
        payment_method: payMethod,
        reference: payRef,
        notes: payNotes,
      });
      setShowPayModal(false);
      setPayAmount("");
      setPayRef("");
      setPayNotes("");
      loadData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Payment failed.";
      setPayError(msg);
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId || !payableId || !targetPaymentId) return;
    setRevError(null);

    if (!reversalReason.trim()) {
      setRevError("Reversal reason is required.");
      return;
    }

    setRevSubmitting(true);
    try {
      await reverseSupplierPayment(currentBusinessId, payableId, targetPaymentId, {
        reversal_reason: reversalReason,
      });
      setShowReverseModal(false);
      setTargetPaymentId("");
      setReversalReason("");
      loadData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Reversal failed.";
      setRevError(msg);
    } finally {
      setRevSubmitting(false);
    }
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId || !payableId) return;
    setCloseSubmitting(true);
    try {
      await closePayable(currentBusinessId, payableId, { notes: closeNotes });
      setShowCloseModal(false);
      setCloseNotes("");
      loadData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Close failed.";
      setError(msg);
    } finally {
      setCloseSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900" data-testid="detail-invoice-number">
              {item.invoice_number}
            </h1>
            <span
              data-testid="detail-status-badge"
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                item.status === "UNPAID" ? "bg-red-50 text-red-700 border border-red-200" :
                item.status === "PARTIAL" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                item.status === "PAID" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                item.status === "CLOSED" ? "bg-gray-100 text-gray-700 border border-gray-200" :
                "bg-slate-100 text-slate-500 border border-slate-200"
              }`}
            >
              {item.status}
            </span>
            {item.is_overdue && (
              <span data-testid="detail-overdue-badge" className="bg-red-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                OVERDUE
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">ID Hutang: {item.id} | Purchase Order ID: {item.purchase_order}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {!isTerminal && (
            <button
              type="button"
              onClick={() => {
                setPayAmount(item.outstanding_amount);
                setShowPayModal(true);
              }}
              data-testid="btn-pay-payable"
              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 font-bold text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none"
            >
              Bayar Tagihan
            </button>
          )}

          {!isTerminal && isOwner && (
            <button
              type="button"
              onClick={() => setShowCloseModal(true)}
              data-testid="btn-close-payable"
              className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-colors focus:outline-none"
            >
              Tutup (Write-Off)
            </button>
          )}
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Transaksi</p>
          <p className="text-xl font-black text-gray-900" data-testid="detail-amount-original">
            {formatRupiah(item.original_amount)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Telah Dibayar</p>
          <p className="text-xl font-black text-emerald-600" data-testid="detail-amount-paid">
            {formatRupiah(item.paid_amount)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sisa Hutang</p>
          <p className="text-xl font-black text-blue-600" data-testid="detail-amount-outstanding">
            {formatRupiah(item.outstanding_amount)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Jatuh Tempo</p>
          <p className="text-xl font-black text-gray-900" data-testid="detail-due-date">
            {item.due_date || "-"}
          </p>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4" data-testid="detail-payment-history">
        <h2 className="text-lg font-bold text-gray-900">Riwayat Pembayaran (Supplier Payment Allocations)</h2>

        {item.allocations.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Belum ada alokasi pembayaran.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th scope="col" className="p-3">Tanggal</th>
                  <th scope="col" className="p-3">Nominal</th>
                  <th scope="col" className="p-3">Metode</th>
                  <th scope="col" className="p-3">Referensi</th>
                  <th scope="col" className="p-3">Status</th>
                  <th scope="col" className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {item.allocations.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-mono text-xs">{new Date(alloc.payment_date).toLocaleString("id-ID")}</td>
                    <td className="p-3 font-bold text-gray-900">{formatRupiah(alloc.amount)}</td>
                    <td className="p-3">{alloc.payment_method}</td>
                    <td className="p-3 text-gray-500">{alloc.reference || "-"}</td>
                    <td className="p-3">
                      {alloc.is_reversed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                          REVERSED ({alloc.reversal_reason})
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                          VALID
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {!alloc.is_reversed && isOwner && item.status !== "CLOSED" && item.status !== "VOIDED" && (
                        <button
                          type="button"
                          data-testid={`btn-reverse-payment-${alloc.id}`}
                          onClick={() => {
                            setTargetPaymentId(alloc.id);
                            setShowReverseModal(true);
                          }}
                          className="text-xs font-bold text-red-600 hover:text-red-800"
                        >
                          Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pay Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Catat Pembayaran Hutang</h3>

            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-sm text-blue-900">
              Sisa Hutang Saat Ini: <strong data-testid="modal-pay-remaining-outstanding">{formatRupiah(item.outstanding_amount)}</strong>
            </div>

            {payError && (
              <div data-testid="modal-pay-error" className="bg-red-50 p-3 rounded-xl border border-red-100 text-red-600 text-xs">
                {payError}
              </div>
            )}

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Nominal Pembayaran</label>
                <input
                  type="number"
                  step="0.01"
                  data-testid="modal-pay-amount-input"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Metode Pembayaran</label>
                <select
                  data-testid="modal-pay-method-select"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethodChoice)}
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
                >
                  <option value="CASH">Tunai (Cash)</option>
                  <option value="QRIS">QRIS</option>
                  <option value="TRANSFER">Transfer Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Referensi (Opsional)</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  data-testid="modal-pay-confirm-btn"
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {paySubmitting ? "Memproses…" : "Konfirmasi Pembayaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reverse Modal */}
      {showReverseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-red-600">Batalkan / Reverse Pembayaran</h3>
            <p className="text-xs text-gray-600">Tindakan ini akan mengembalikan saldo outstanding hutang ini. Owner Only.</p>

            {revError && (
              <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-red-600 text-xs">
                {revError}
              </div>
            )}

            <form onSubmit={handleReverseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Alasan Pembatalan (Wajib)</label>
                <textarea
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
                  rows={3}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReverseModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={revSubmitting}
                  className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {revSubmitting ? "Memproses…" : "Konfirmasi Reversal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Tutup Hutang (Write-Off)</h3>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900">
              <strong>PENTING:</strong> Menutup hutang akan menghapus sisa tagihan (set to 0,00) sebagai penghapusan hutang (CLOSED != PAID).
            </div>

            <form onSubmit={handleCloseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Catatan Penutupan</label>
                <textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={closeSubmitting}
                  className="px-5 py-2 text-sm font-bold text-white bg-gray-900 hover:bg-black rounded-xl shadow-sm disabled:opacity-50"
                >
                  {closeSubmitting ? "Memproses…" : "Konfirmasi Tutup Hutang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
