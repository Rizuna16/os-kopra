import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { createCreditSale } from "../receivable/receivableService";
import type { PaymentMethodChoice } from "../receivable/types";
import { listCustomers } from "../customer/customerService";
import type { Customer } from "../customer/types";
import { listLocations } from "../business/businessService";
import type { LocationSummary } from "../business/types";
import { listProducts } from "../product/productService";
import type { Product } from "../product/types";
import { listVariants } from "../product/variantService";
import type { Variant } from "../product/variantTypes";
import { ApiError } from "../auth/types";

interface LineDraft {
  variant: string;
  quantity: string;
  unit_price: string;
}

export function CreditSaleCreate() {
  const { currentBusinessId, currentLocationId } = useBusiness();
  const navigate = useNavigate();

  const [location, setLocation] = useState(currentLocationId || "");
  const [customer, setCustomer] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ variant: "", quantity: "1.00", unit_price: "0.00" }]);
  const [initialPayment, setInitialPayment] = useState("0.00");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodChoice>("CASH");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [reference, setReference] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [allVariants, setAllVariants] = useState<Variant[]>([]);

  useEffect(() => {
    if (!currentBusinessId) return;
    let cancelled = false;

    Promise.all([
      listCustomers(currentBusinessId).catch(() => []),
      listLocations(currentBusinessId).catch(() => []),
      listProducts(currentBusinessId)
        .then((products: Product[]) => {
          if (cancelled) return [];
          return Promise.all(products.map((p) => listVariants(currentBusinessId, p.id).catch(() => [])));
        })
        .then((v) => (cancelled ? [] : v.flat()))
        .catch(() => []),
    ]).then(([c, l, v]) => {
      if (cancelled) return;
      const safeLocs = Array.isArray(l) ? l : [];
      const safeVars = Array.isArray(v) ? v : [];
      setCustomers(Array.isArray(c) ? c : []);
      setLocations(safeLocs);
      setAllVariants(safeVars);
      if (safeLocs.length > 0 && !location) {
        setLocation(safeLocs[0].id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, location]);

  const totalAmount = lines.reduce((acc, l) => {
    const q = parseFloat(l.quantity) || 0;
    const p = parseFloat(l.unit_price) || 0;
    return acc + q * p;
  }, 0);

  const dpAmount = parseFloat(initialPayment) || 0;
  const isOverpayment = dpAmount > totalAmount;

  const updateLine = (idx: number, field: keyof LineDraft, val: string) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: val } : l)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { variant: "", quantity: "1.00", unit_price: "0.00" }]);
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId) return;
    if (!location) {
      setError("Location is required.");
      return;
    }
    if (!customer) {
      setError("Customer is required.");
      return;
    }
    if (isOverpayment) {
      setError("Initial payment cannot exceed total sale amount.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        location,
        customer,
        lines: lines.map((l) => ({
          variant: l.variant,
          quantity: l.quantity,
          unit_price: l.unit_price,
        })),
        initial_payment: initialPayment,
        payment_method: paymentMethod,
        due_date: dueDate || null,
        notes,
        reference,
        invoice_number: invoiceNumber || undefined,
      };

      const res = await createCreditSale(currentBusinessId, payload);
      navigate(`/receivables/${res.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create credit sale.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Buat Penjualan Kredit / Piutang</h1>
          <p className="text-sm text-gray-500">Catat transaksi penjualan kredit baru untuk pelanggan.</p>
        </div>

        {error && (
          <div data-testid="credit-sale-error" className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-600 text-sm">
            {error}
          </div>
        )}

        {isOverpayment && (
          <div data-testid="credit-sale-overpayment-error" className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-800 text-xs">
            Pembayaran awal (DP) tidak boleh melebihi total nilai penjualan.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="credit-sale-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="select-location" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Location
              </label>
              <select
                id="select-location"
                data-testid="credit-sale-select-location"
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

            <div>
              <label htmlFor="select-customer" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Customer
              </label>
              <select
                id="select-customer"
                data-testid="credit-sale-select-customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
                required
              >
                <option value="">Pilih Pelanggan</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3" data-testid="credit-sale-lines">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700 uppercase">Barang / Varian</label>
              <button
                type="button"
                onClick={addLine}
                className="text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                + Tambah Baris
              </button>
            </div>

            {lines.map((line, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <select
                  value={line.variant}
                  onChange={(e) => {
                    const selected = allVariants.find((v) => v.id === e.target.value);
                    updateLine(idx, "variant", e.target.value);
                  }}
                  className="flex-1 min-w-[180px] text-sm border border-gray-200 rounded-xl p-2 bg-white"
                  required
                >
                  <option value="">Pilih Varian</option>
                  {allVariants.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>

                <input
                  type="number"
                  step="0.01"
                  placeholder="Jumlah"
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                  className="w-24 text-sm border border-gray-200 rounded-xl p-2 bg-white"
                  required
                />

                <input
                  type="number"
                  step="0.01"
                  placeholder="Harga Satuan"
                  value={line.unit_price}
                  onChange={(e) => updateLine(idx, "unit_price", e.target.value)}
                  className="w-32 text-sm border border-gray-200 rounded-xl p-2 bg-white"
                  required
                />

                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1"
                  >
                    Hapus
                  </button>
                )}
              </div>
            ))}
          </div>

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
                data-testid="credit-sale-initial-payment"
                value={initialPayment}
                onChange={(e) => setInitialPayment(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="payment-method" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Payment Method
              </label>
              <select
                id="payment-method"
                data-testid="credit-sale-payment-method"
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
                Due Date
              </label>
              <input
                type="date"
                id="due-date"
                data-testid="credit-sale-due-date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="invoice-number" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Invoice Number (Optional)
              </label>
              <input
                type="text"
                id="invoice-number"
                data-testid="credit-sale-invoice-number"
                placeholder="Otomatis jika dikosongkan"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="reference" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Reference
              </label>
              <input
                type="text"
                id="reference"
                data-testid="credit-sale-reference"
                placeholder="No. Referensi Pembayaran / Po"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Notes
              </label>
              <input
                type="text"
                id="notes"
                data-testid="credit-sale-notes"
                placeholder="Catatan tambahan"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <div>
              <p className="text-xs text-gray-500">Total Nilai Penjualan</p>
              <p className="text-lg font-bold text-gray-900">
                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(totalAmount)}
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || isOverpayment}
              data-testid="credit-sale-submit-btn"
              className="py-3 px-6 bg-blue-600 hover:bg-blue-700 font-bold text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none disabled:opacity-50"
            >
              {submitting ? (
                <span data-testid="credit-sale-submitting">Menyimpan…</span>
              ) : (
                "Simpan Piutang"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
