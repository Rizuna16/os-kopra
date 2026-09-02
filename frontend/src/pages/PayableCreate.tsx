import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { createPayable } from "../payable/payableService";
import type { PaymentMethodChoice } from "../payable/types";
import { listPurchaseOrders } from "../purchasing/purchasingService";
import type { PurchaseOrder } from "../purchasing/types";
import { listLocations } from "../business/businessService";
import type { LocationSummary } from "../business/types";
import { listSuppliers } from "../supplier/supplierService";
import type { Supplier } from "../supplier/types";
import { ApiError } from "../auth/types";

export function PayableCreate() {
  const { currentBusinessId, currentLocationId } = useBusiness();
  const navigate = useNavigate();

  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [location, setLocation] = useState(currentLocationId || "");
  const [initialPayment, setInitialPayment] = useState("0.00");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodChoice>("CASH");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    if (!currentBusinessId) return;
    let cancelled = false;

    Promise.all([
      listPurchaseOrders(currentBusinessId).catch(() => []),
      listLocations(currentBusinessId).catch(() => []),
      listSuppliers(currentBusinessId).catch(() => []),
    ]).then(([pos, locs, sups]) => {
      if (cancelled) return;
      const safeLocs = Array.isArray(locs) ? locs : [];
      // Only CONFIRMED purchase orders are eligible for credit payable
      const confirmedPOs = (Array.isArray(pos) ? pos : []).filter((po) => po.status === "CONFIRMED");
      setPurchaseOrders(confirmedPOs);
      setLocations(safeLocs);
      setSuppliers(Array.isArray(sups) ? sups : []);
      if (safeLocs.length > 0 && !location) {
        setLocation(safeLocs[0].id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, location]);

  const selectedPO = purchaseOrders.find((p) => p.id === purchaseOrder);
  const selectedSupplier = selectedPO ? suppliers.find((s) => s.id === selectedPO.supplier) : null;

  const totalAmount = selectedPO
    ? (selectedPO.lines || []).reduce((sum, line) => sum + (Number(line.quantity) * Number(line.unit_price)), 0)
    : 0;

  const dpAmount = parseFloat(initialPayment) || 0;
  const isOverpayment = dpAmount > totalAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId) return;
    if (!purchaseOrder) {
      setError("Purchase Order is required.");
      return;
    }
    if (!location) {
      setError("Location is required.");
      return;
    }
    if (isOverpayment) {
      setError("Initial payment cannot exceed total payable amount.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        purchase_order: purchaseOrder,
        location,
        initial_payment: initialPayment,
        payment_method: paymentMethod,
        due_date: dueDate || null,
        notes,
        invoice_number: invoiceNumber || undefined,
      };

      const res = await createPayable(currentBusinessId, payload);
      navigate(`/payables/${res.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create credit payable.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Buat Utang Usaha (Payable)</h1>
          <p className="text-sm text-gray-500">Catat transaksi hutang ke supplier dari Purchase Order (PO) yang sudah dikonfirmasi.</p>
        </div>

        {error && (
          <div data-testid="payable-error" className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-600 text-sm">
            {error}
          </div>
        )}

        {isOverpayment && (
          <div data-testid="payable-overpayment-error" className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-800 text-xs">
            Pembayaran awal (DP) tidak boleh melebihi total nilai hutang.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="payable-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="select-po" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Purchase Order (PO Confirmed)
              </label>
              <select
                id="select-po"
                data-testid="payable-select-po"
                value={purchaseOrder}
                onChange={(e) => {
                  setPurchaseOrder(e.target.value);
                  const po = purchaseOrders.find((p) => p.id === e.target.value);
                  if (po) {
                    setLocation(po.location);
                  }
                }}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
                required
              >
                <option value="">Pilih Purchase Order</option>
                {purchaseOrders.map((p) => (
                  <option key={p.id} value={p.id}>
                    PO #{p.id.substring(0, 8)} ({suppliers.find((s) => s.id === p.supplier)?.name || "Supplier"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="select-location" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Lokasi
              </label>
              <select
                id="select-location"
                data-testid="payable-select-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
                required
              >
                <option value="">Pilih Lokasi</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Supplier & Total Summary */}
          {selectedPO && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Supplier:</span>
                <span className="font-bold text-gray-900">{selectedSupplier?.name || selectedPO.supplier}</span>
              </div>
              <div className="flex justify-between">
                <span>Jumlah Item / Lines:</span>
                <span className="font-mono">{selectedPO.lines.length} baris</span>
              </div>
            </div>
          )}

          {/* Payment & Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
            <div>
              <label htmlFor="initial-payment" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Initial Payment (DP)
              </label>
              <input
                type="number"
                step="0.01"
                id="initial-payment"
                data-testid="payable-initial-payment"
                value={initialPayment}
                onChange={(e) => setInitialPayment(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="payment-method" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Metode Pembayaran
              </label>
              <select
                id="payment-method"
                data-testid="payable-payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodChoice)}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
              >
                <option value="CASH">Tunai (Cash)</option>
                <option value="QRIS">QRIS</option>
                <option value="TRANSFER">Transfer Bank</option>
              </select>
            </div>

            <div>
              <label htmlFor="due-date" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Due Date (Jatuh Tempo)
              </label>
              <input
                type="date"
                id="due-date"
                data-testid="payable-due-date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="invoice-number" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                No. Invoice (Opsional)
              </label>
              <input
                type="text"
                id="invoice-number"
                data-testid="payable-invoice-number"
                placeholder="Otomatis jika dikosongkan"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="notes" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Catatan (Notes)
              </label>
              <input
                type="text"
                id="notes"
                data-testid="payable-notes"
                placeholder="Catatan tambahan"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <div>
              <p className="text-xs text-gray-500">Total Nilai Hutang</p>
              <p className="text-lg font-bold text-gray-900">
                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(totalAmount)}
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || isOverpayment || !purchaseOrder}
              data-testid="payable-submit-btn"
              className="py-3 px-6 bg-blue-600 hover:bg-blue-700 font-bold text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none disabled:opacity-50"
            >
              {submitting ? (
                <span data-testid="payable-submitting">Menyimpan…</span>
              ) : (
                "Simpan Utang"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
