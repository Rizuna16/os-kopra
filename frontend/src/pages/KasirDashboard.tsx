import { useEffect, useState } from "react";
import { useBusiness } from "../business/BusinessContext";
import {
  listShifts,
  openShift,
  closeShift,
  listSales,
  createSale,
  updateSale,
} from "../kasir/kasirService";
import type { CashierShift, Sale, PaymentMethod } from "../kasir/types";
import { ApiError } from "../auth/types";

export function KasirDashboard() {
  const { currentBusinessId, currentLocationId } = useBusiness();
  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [heldSales, setHeldSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Open Shift Form State
  const [modalAwal, setModalAwal] = useState("0");
  const [openError, setOpenError] = useState<string | null>(null);

  // Close Shift Form State
  const [uangTunaiAktual, setUangTunaiAktual] = useState("0");
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closedShiftInfo, setClosedShiftInfo] = useState<CashierShift | null>(null);

  // POS / Cart State
  const [searchVal, setSearchVal] = useState("");
  const [cart, setCart] = useState<{ variantId: string; quantity: number; unitPrice: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [saleError, setSaleError] = useState<string | null>(null);

  const loadDashboardData = async (businessId: string, locationId: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const fetchedShifts = (await listShifts(businessId)) || [];
      setShifts(fetchedShifts);
      const active = fetchedShifts.find(
        (s) => s.status === "OPEN" && (!locationId || s.location === locationId),
      );
      setActiveShift(active || null);
      const fetchedSales = (await listSales(businessId)) || [];
      setHeldSales(fetchedSales.filter((s) => s.status === "HELD"));
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to load Kasir data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentBusinessId) return;
    loadDashboardData(currentBusinessId, currentLocationId || null);
  }, [currentBusinessId, currentLocationId]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId || !currentLocationId) return;
    setOpenError(null);
    try {
      const shift = await openShift(currentBusinessId, currentLocationId, modalAwal);
      setActiveShift(shift);
      setClosedShiftInfo(null);
      setModalAwal("0");
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to open shift";
      setOpenError(msg);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId || !activeShift) return;
    setCloseError(null);
    try {
      const closed = await closeShift(currentBusinessId, activeShift.id, uangTunaiAktual);
      setClosedShiftInfo(closed);
      setActiveShift(null);
      setUangTunaiAktual("0");
      const fetchedShifts = (await listShifts(currentBusinessId)) || [];
      setShifts(fetchedShifts);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to close shift";
      setCloseError(msg);
    }
  };

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    const variantId = searchVal.trim();
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.variantId === variantId);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { variantId, quantity: 1, unitPrice: 50000 }];
    });
    setSearchVal("");
  };

  const handleQtyChange = (variantId: string, valStr: string) => {
    const qty = parseFloat(valStr) || 0;
    setCart((prev) =>
      prev.map((item) => (item.variantId === variantId ? { ...item, quantity: qty } : item)),
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleSubmitSale = async () => {
    if (!currentBusinessId || !currentLocationId) return;
    setSaleError(null);
    try {
      await createSale(currentBusinessId, {
        location: currentLocationId,
        status: "COMPLETED",
        payment_method: paymentMethod,
        lines: cart.map((item) => ({
          variant: item.variantId,
          quantity: item.quantity.toString(),
          unit_price: item.unitPrice.toString(),
        })),
      });
      setCart([]);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to complete transaction";
      setSaleError(msg);
    }
  };

  const handleHoldSale = async () => {
    if (!currentBusinessId || !currentLocationId) return;
    setSaleError(null);
    try {
      const created = await createSale(currentBusinessId, {
        location: currentLocationId,
        status: "HELD",
        payment_method: null,
        lines: cart.map((item) => ({
          variant: item.variantId,
          quantity: item.quantity.toString(),
          unit_price: item.unitPrice.toString(),
        })),
      });
      setHeldSales((prev) => [created, ...prev]);
      setCart([]);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to hold transaction";
      setSaleError(msg);
    }
  };

  const handleResumeSale = async (saleId: string) => {
    if (!currentBusinessId) return;
    setSaleError(null);
    try {
      await updateSale(currentBusinessId, saleId, {
        status: "COMPLETED",
        payment_method: "CASH",
      });
      setHeldSales((prev) => prev.filter((s) => s.id !== saleId));
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to resume transaction";
      setSaleError(msg);
    }
  };

  return (
    <div data-testid="kasir-dashboard" className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Dashboard Kasir</h1>
          <p className="mt-2 text-sm text-gray-500">Kelola shift kasir dan transaksi penjualan cabang Anda.</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-sm text-gray-500">Memuat data...</div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Shift Control Column */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-6">
              <h2 className="text-lg font-medium text-gray-900 border-b pb-3">Status Shift Aktif</h2>

              {!activeShift ? (
                <form data-testid="open-shift-form" onSubmit={handleOpenShift} className="space-y-4">
                  {openError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{openError}</div>}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Modal Awal Kas (IDR)</label>
                    <input
                      type="number"
                      data-testid="modal-awal-input"
                      value={modalAwal}
                      onChange={(e) => setModalAwal(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    data-testid="open-shift-submit"
                    className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                  >
                    Buka Shift Baru
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-md bg-green-50 p-4 border border-green-200 space-y-2">
                    <p className="text-sm font-semibold text-green-800">Shift Sedang Terbuka</p>
                    <p className="text-xs text-gray-600">ID Shift: {activeShift.id}</p>
                    <p className="text-xs text-gray-600">Modal Awal: {activeShift.modal_awal}</p>
                    <p className="text-xs text-gray-600">Dibuka Pada: {new Date(activeShift.opened_at).toLocaleString()}</p>
                  </div>

                  <form data-testid="close-shift-form" onSubmit={handleCloseShift} className="space-y-4">
                    {closeError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{closeError}</div>}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Uang Tunai Aktual di Laci (IDR)</label>
                      <input
                        type="number"
                        data-testid="uang-tunai-aktual-input"
                        value={uangTunaiAktual}
                        onChange={(e) => setUangTunaiAktual(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      data-testid="close-shift-submit"
                      className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                    >
                      Tutup Shift & Rekonsiliasi
                    </button>
                  </form>
                </div>
              )}

              {/* Last Closed Shift Reconciliation Info */}
              {closedShiftInfo && (
                <div className="rounded-md bg-blue-50 p-4 border border-blue-200 space-y-2 mt-4">
                  <p className="text-sm font-semibold text-blue-800">Laporan Penutupan Shift</p>
                  <p className="text-xs text-gray-600">Modal Awal: {closedShiftInfo.modal_awal}</p>
                  <p className="text-xs text-gray-600">Uang Tunai Aktual: {closedShiftInfo.uang_tunai_aktual}</p>
                  <p className="text-xs text-gray-600">Total Penjualan Tunai: {closedShiftInfo.total_penjualan_tunai}</p>
                  <p className="text-xs font-bold text-gray-800">
                    Selisih Kas: <span data-testid="shift-selisih-kas">{closedShiftInfo.selisih_kas}</span>
                  </p>
                </div>
              )}
            </div>

            {/* POS Cart Section (always available; requires active shift to complete) */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 lg:col-span-2 space-y-6">
              <h2 className="text-lg font-medium text-gray-900 border-b pb-3">Transaksi Penjualan Baru</h2>

              {!activeShift ? (
                <div className="text-center py-6 text-amber-600 text-sm rounded bg-amber-50 border border-amber-200">
                  Silakan buka shift kasir terlebih dahulu untuk memulai transaksi penjualan.
                </div>
              ) : null}

              {saleError && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-100">
                  {saleError}
                </div>
              )}

              {/* Add Product Form */}
              <form onSubmit={handleAddToCart} className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    data-testid="product-search-input"
                    placeholder="Masukkan UUID Varian Produk"
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <button
                  type="submit"
                  data-testid="add-to-cart-button"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Tambah ke Keranjang
                </button>
              </form>

              {/* Cart Lines */}
              <div className="border rounded-md divide-y overflow-hidden">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-500">Keranjang masih kosong</div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.variantId}
                      data-testid={`cart-line-${item.variantId}`}
                      className="p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Varian: {item.variantId}</p>
                        <p className="text-xs text-gray-500">Harga Satuan: IDR {item.unitPrice}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="number"
                          data-testid={`cart-qty-${item.variantId}`}
                          value={item.quantity}
                          onChange={(e) => handleQtyChange(item.variantId, e.target.value)}
                          className="w-20 text-center rounded border-gray-300 text-sm"
                        />
                        <p className="text-sm font-bold text-gray-900">IDR {item.quantity * item.unitPrice}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Total */}
              <div className="flex justify-between items-center font-bold text-lg border-t pt-4">
                <span>Total Pembayaran:</span>
                <span data-testid="cart-total">IDR {cartTotal}</span>
              </div>

              {/* Payment Method Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Metode Pembayaran</label>
                <select
                  data-testid="payment-method-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500"
                >
                  <option value="CASH">CASH</option>
                  <option value="QRIS">QRIS</option>
                  <option value="TRANSFER">TRANSFER</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end">
                <button
                  type="button"
                  data-testid="hold-sale-button"
                  onClick={handleHoldSale}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Tahan Transaksi (Hold)
                </button>
                <button
                  type="button"
                  data-testid="submit-sale-button"
                  onClick={handleSubmitSale}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Selesaikan Transaksi
                </button>
              </div>

              {/* Held Sales Section */}
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-md font-medium text-gray-900">Transaksi Ditahan (Held)</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {heldSales.length === 0 ? (
                    <p className="text-sm text-gray-500">Tidak ada transaksi yang ditahan.</p>
                  ) : (
                    heldSales.map((sale) => (
                      <div
                        key={sale.id}
                        data-testid={`held-transaction-${sale.id}`}
                        className="p-4 border rounded bg-yellow-50 border-yellow-200 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-yellow-900">ID Transaksi: {sale.id.slice(0, 8)}...</p>
                          <p className="text-xs text-yellow-700">Status: {sale.status}</p>
                        </div>
                        <button
                          type="button"
                          data-testid={`resume-sale-button-${sale.id}`}
                          onClick={() => handleResumeSale(sale.id)}
                          className="inline-flex justify-center py-1 px-3 border border-transparent text-xs font-medium rounded text-white bg-yellow-600 hover:bg-yellow-700"
                        >
                          Lanjutkan
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
