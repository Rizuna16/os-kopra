import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useBusiness } from "../business/BusinessContext";
import { getCashflowReport, getFinanceReport } from "../reports/reportsService";
import type { CashflowReport } from "../reports/types";

function formatCurrency(amount: string) {
  const num = parseFloat(amount);
  if (isNaN(num)) return "Rp0,00";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + " " + d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function ReportsCashflow() {
  const { currentBusinessId, currentLocationId } = useBusiness();
  const [data, setData] = useState<CashflowReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);

  // Load locations for filter
  useEffect(() => {
    if (!currentBusinessId) return;
    const { listLocations } = require("../business/businessService");
    listLocations(currentBusinessId)
      .then((locs: unknown) => {
        if (Array.isArray(locs)) setLocations(locs);
      })
      .catch(() => setLocations([]));
  }, [currentBusinessId]);

  const fetchData = useCallback(
    async (from?: string, to?: string, loc?: string) => {
      if (!currentBusinessId) return;
      setLoading(true);
      setError(null);
      try {
        if (from && to && from > to) {
          throw new Error("Invalid date range");
        }
        const filter = {
          date_from: from || undefined,
          date_to: to || undefined,
          location: loc || undefined,
        };
        const res = await getCashflowReport(currentBusinessId, filter);
        setData(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load cashflow report");
      } finally {
        setLoading(false);
      }
    },
    [currentBusinessId]
  );

  useEffect(() => {
    void fetchData(dateFrom, dateTo, locationFilter);
  }, [fetchData]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void fetchData(dateFrom, dateTo, locationFilter);
  };

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");
    setLocationFilter("");
    void fetchData("", "", "");
  };

  const formatDirection = (dir: string) => {
    if (dir === "INFLOW") return "Masuk";
    if (dir === "OUTFLOW") return "Keluar";
    if (dir === "INFLOW_REVERSAL") return "Pembatalan Masuk";
    if (dir === "OUTFLOW_REVERSAL") return "Pembatalan Keluar";
    return dir;
  };

  const formatSource = (src: string) => {
    if (src === "POS_SALE") return "Penjualan Tunai POS";
    if (src === "RECEIVABLE_PAYMENT") return "Pelunasan Piutang";
    if (src === "SUPPLIER_PAYMENT") return "Pembayaran Supplier";
    if (src === "EXPENSE") return "Pengeluaran";
    return src;
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="reports-cashflow-page">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Laporan Arus Kas Operasional</h1>
          <p className="text-sm text-gray-500 mt-1">Pergerakan kas aktual dari transaksi bisnis operasional.</p>
        </div>

        {/* Filter Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6" data-testid="cashflow-filters">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full sm:w-44">
              <label htmlFor="cf-date-from" className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
              <input
                id="cf-date-from"
                type="date"
                data-testid="cashflow-date-from"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
            <div className="w-full sm:w-44">
              <label htmlFor="cf-date-to" className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
              <input
                id="cf-date-to"
                type="date"
                data-testid="cashflow-date-to"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
            <div className="w-full sm:w-44">
              <label htmlFor="cf-location" className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
              <select
                id="cf-location"
                data-testid="cashflow-location"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                <option value="">Semua Lokasi</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="submit"
                data-testid="cashflow-filter-btn"
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              >
                Filter
              </button>
              <button
                type="button"
                data-testid="cashflow-reset-btn"
                onClick={handleReset}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 font-medium text-sm text-gray-700 rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div data-testid="cashflow-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-4">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div data-testid="cashflow-loading" className="text-sm text-gray-500 py-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
            Memuat laporan arus kas...
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && data && data.cash_movements.length === 0 && (
          <div data-testid="cashflow-empty" className="text-sm text-gray-500 py-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
            Tidak ada data arus kas untuk periode ini.
          </div>
        )}

        {/* Data Display */}
        {!loading && !error && data && data.cash_movements.length > 0 && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Cash Inflow</p>
                <p className="text-2xl font-black text-emerald-600" data-testid="kpi-cash-inflow">
                  {formatCurrency(data.summary.total_inflow)}
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Cash Outflow</p>
                <p className="text-2xl font-black text-rose-600" data-testid="kpi-cash-outflow">
                  {formatCurrency(data.summary.total_outflow)}
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Cash Flow</p>
                <p
                  className={`text-2xl font-black ${
                    parseFloat(data.summary.net_cashflow) >= 0 ? "text-emerald-700" : "text-red-700"
                  }`}
                  data-testid="kpi-net-cashflow"
                >
                  {formatCurrency(data.summary.net_cashflow)}
                </p>
              </div>
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm" data-testid="breakdown-inflow">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Rincian Kas Masuk</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Penjualan Tunai POS Regular</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(data.inflow_breakdown.pos_cash_sales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pelunasan Piutang Pelanggan</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(data.inflow_breakdown.receivable_collections)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm" data-testid="breakdown-outflow">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Rincian Kas Keluar</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pembayaran Hutang Supplier</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(data.outflow_breakdown.supplier_payments)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pengeluaran Operasional</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(data.outflow_breakdown.expenses)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Movement History Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">Riwayat Pergerakan Kas Operasional</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700" data-testid="cashflow-movement-table">
                  <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Tipe</th>
                      <th className="px-4 py-3">Sumber</th>
                      <th className="px-4 py-3">Referensi</th>
                      <th className="px-4 py-3">Metode</th>
                      <th className="px-4 py-3 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.cash_movements.map((m, idx) => (
                      <tr key={`${m.id}-${idx}`} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDateTime(m.date)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              m.direction === "INFLOW" ? "bg-emerald-50 text-emerald-700" :
                              m.direction === "OUTFLOW" ? "bg-rose-50 text-rose-700" :
                              m.direction === "INFLOW_REVERSAL" ? "bg-amber-50 text-amber-700" :
                              "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {formatDirection(m.direction)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{formatSource(m.source_type)}</td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{m.reference}</td>
                        <td className="px-4 py-3 text-gray-600">{m.payment_method || "-"}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${
                          m.direction.includes("IN") && !m.direction.includes("REVERSAL") ? "text-emerald-600" :
                          m.direction === "REVERSAL" ? "text-emerald-600" :
                          "text-rose-600"
                        }`}>
                          {m.direction === "INFLOW_REVERSAL" || m.direction === "OUTFLOW_REVERSAL"
                            ? `${parseFloat(m.amount) < 0 ? "-" : "+"} ${formatCurrency(String(Math.abs(parseFloat(m.amount))))}`
                            : formatCurrency(m.amount)
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
