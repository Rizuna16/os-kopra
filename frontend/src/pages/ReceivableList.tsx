import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { listReceivables, getReceivableReports } from "../receivable/receivableService";
import type { Receivable, PiutangReportResponse } from "../receivable/types";
import { listCustomers } from "../customer/customerService";
import type { Customer } from "../customer/types";
import { listLocations } from "../business/businessService";
import type { LocationSummary } from "../business/types";
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

export function ReceivableList() {
  const { currentBusinessId, currentLocationId } = useBusiness();
  const navigate = useNavigate();

  const [items, setItems] = useState<Receivable[]>([]);
  const [report, setReport] = useState<PiutangReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [status, setStatus] = useState("");
  const [customer, setCustomer] = useState("");
  const [location, setLocation] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<LocationSummary[]>([]);

  useEffect(() => {
    if (!currentBusinessId) return;
        listCustomers(currentBusinessId)
          .then((c) => setCustomers(Array.isArray(c) ? c : []))
          .catch(() => setCustomers([]));
        listLocations(currentBusinessId)
          .then((l) => setLocations(Array.isArray(l) ? l : []))
          .catch(() => setLocations([]));
  }, [currentBusinessId]);

  useEffect(() => {
    if (!currentBusinessId) {
      setItems([]);
      setReport(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const filterParams: Record<string, string> = {};
    if (status) filterParams.status = status;
    if (customer) filterParams.customer = customer;
    if (location) filterParams.location = location;
    if (currentLocationId && !location) filterParams.location = currentLocationId;
    if (overdue) filterParams.overdue = "true";
    if (dateFrom) filterParams.date_from = dateFrom;
    if (dateTo) filterParams.date_to = dateTo;

    Promise.all([
      listReceivables(currentBusinessId, filterParams),
      getReceivableReports(currentBusinessId).catch(() => null),
    ])
      .then(([recData, repData]) => {
        if (cancelled) return;
        setItems(Array.isArray(recData) ? recData : []);
        setReport(repData);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        const msg = e instanceof ApiError ? e.message : "Failed to load receivables";
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, currentLocationId, status, customer, location, overdue, dateFrom, dateTo, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Piutang</h1>
          <p className="text-sm text-gray-500">Kelola dan pantau seluruh tagihan piutang usaha Anda.</p>
        </div>
        <Link
          to="/receivables/new"
          className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        >
          Buat Piutang
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Outstanding</p>
          <p className="text-2xl font-black text-gray-900" data-testid="kpi-total-outstanding">
            {report ? formatRupiah(report.total_outstanding) : "Rp0,00"}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Overdue</p>
          <p className="text-2xl font-black text-red-600" data-testid="kpi-total-overdue">
            {report ? formatRupiah(report.total_overdue) : "Rp0,00"}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pelanggan Memiliki Hutang</p>
          <p className="text-2xl font-black text-gray-900" data-testid="kpi-customers-with-debt">
            {report ? report.count_customers_with_debt : 0}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor="filter-status">Status</label>
          <select
            id="filter-status"
            data-testid="filter-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl p-2 bg-gray-50 focus:bg-white"
          >
            <option value="">Semua Status</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
            <option value="CLOSED">Closed</option>
            <option value="VOIDED">Voided</option>
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor="filter-customer">Customer</label>
          <select
            id="filter-customer"
            data-testid="filter-customer"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl p-2 bg-gray-50 focus:bg-white"
          >
            <option value="">Semua Customer</option>
            {(customers || []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor="filter-location">Lokasi</label>
          <select
            id="filter-location"
            data-testid="filter-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl p-2 bg-gray-50 focus:bg-white"
          >
            <option value="">Semua Lokasi</option>
            {(locations || []).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor="filter-date-from">Dari Tanggal</label>
          <input
            type="date"
            id="filter-date-from"
            data-testid="filter-date-from"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl p-2 bg-gray-50 focus:bg-white"
          />
        </div>

        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor="filter-date-to">Sampai Tanggal</label>
          <input
            type="date"
            id="filter-date-to"
            data-testid="filter-date-to"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl p-2 bg-gray-50 focus:bg-white"
          />
        </div>

        <div className="flex items-center pt-5">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              data-testid="filter-overdue"
              checked={overdue}
              onChange={(e) => setOverdue(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Hanya Overdue
          </label>
        </div>
      </div>

      {/* Main Table Area */}
      {loading ? (
        <div data-testid="receivable-list-loading" className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
          Memuat data piutang…
        </div>
      ) : error ? (
        <div data-testid="receivable-list-error" className="bg-red-50 p-4 rounded-2xl border border-red-100 text-red-600 text-sm">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div data-testid="receivable-list-empty" className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
          Tidak ada data piutang.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" data-testid="receivable-list">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700" data-testid="receivable-table">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th scope="col" className="p-4" data-testid="receivable-column-header-invoice">Invoice #</th>
                  <th scope="col" className="p-4" data-testid="receivable-column-header-customer">Customer</th>
                  <th scope="col" className="p-4" data-testid="receivable-column-header-location">Lokasi</th>
                  <th scope="col" className="p-4" data-testid="receivable-column-header-original">Total Awal</th>
                  <th scope="col" className="p-4" data-testid="receivable-column-header-paid">Telah Dibayar</th>
                  <th scope="col" className="p-4" data-testid="receivable-column-header-outstanding">Sisa Tagihan</th>
                  <th scope="col" className="p-4" data-testid="receivable-column-header-due-date">Jatuh Tempo</th>
                  <th scope="col" className="p-4" data-testid="receivable-column-header-status">Status</th>
                  <th scope="col" className="p-4" data-testid="receivable-column-header-overdue">Overdue</th>
                  <th scope="col" className="p-4 text-right" data-testid="receivable-column-header-actions">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((row) => (
                  <tr key={row.id} data-testid={`receivable-row-${row.id}`} className="hover:bg-gray-50/50">
                    <td className="p-4 font-mono font-medium text-gray-900">{row.invoice_number}</td>
                    <td className="p-4">{customers.find((c) => c.id === row.customer)?.name || row.customer}</td>
                    <td className="p-4">{locations.find((l) => l.id === row.location)?.name || row.location}</td>
                    <td className="p-4 font-medium">{formatRupiah(row.original_amount)}</td>
                    <td className="p-4 text-emerald-600">{formatRupiah(row.paid_amount)}</td>
                    <td className="p-4 font-bold text-gray-900">{formatRupiah(row.outstanding_amount)}</td>
                    <td className="p-4">{row.due_date || "-"}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        row.status === "UNPAID" ? "bg-red-50 text-red-700 border border-red-200" :
                        row.status === "PARTIAL" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        row.status === "PAID" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        row.status === "CLOSED" ? "bg-gray-100 text-gray-700 border border-gray-200" :
                        "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {row.is_overdue ? (
                        <span className="bg-red-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                          OVERDUE
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Link
                        to={`/receivables/${row.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Lihat
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
