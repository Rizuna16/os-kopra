import { useEffect, useState } from "react";
import { useBusiness } from "../business/BusinessContext";
import { getReceivableReports } from "../receivable/receivableService";
import type { PiutangReportResponse } from "../receivable/types";
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

export function PiutangReports() {
  const { currentBusinessId } = useBusiness();
  const [data, setData] = useState<PiutangReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId) return;
    let active = true;
    setLoading(true);
    setError(null);

    getReceivableReports(currentBusinessId)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (!active) return;
        const msg = err instanceof ApiError ? err.message : "Failed to load piutang reports.";
        setError(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentBusinessId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-gray-500 font-medium">Memuat laporan piutang…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto bg-red-50 p-4 rounded-2xl border border-red-100 text-red-600 text-sm">
          {error || "Report data unavailable."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Laporan Umur & Ringkasan Piutang (Aging Reports)</h1>
        <p className="text-sm text-gray-500">Analisis umur piutang dan ringkasan hutang per pelanggan.</p>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Outstanding</p>
          <p className="text-2xl font-black text-gray-900">{formatRupiah(data.total_outstanding)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Overdue</p>
          <p className="text-2xl font-black text-red-600">{formatRupiah(data.total_overdue)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pelanggan Memiliki Hutang</p>
          <p className="text-2xl font-black text-gray-900">{data.count_customers_with_debt}</p>
        </div>
      </div>

      {/* Aging Buckets */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Umur Piutang (Aging Summary)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1" data-testid="aging-bucket-not-due">
            <p className="text-xs font-bold text-gray-500 uppercase">Belum Jatuh Tempo</p>
            <p className="text-lg font-black text-gray-900">{formatRupiah(data.aging_summary.not_due)}</p>
          </div>

          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-1" data-testid="aging-bucket-days-1-15">
            <p className="text-xs font-bold text-amber-700 uppercase">1 - 15 Hari</p>
            <p className="text-lg font-black text-amber-900">{formatRupiah(data.aging_summary.days_1_15)}</p>
          </div>

          <div className="bg-amber-100 p-4 rounded-xl border border-amber-200 space-y-1" data-testid="aging-bucket-days-16-30">
            <p className="text-xs font-bold text-amber-800 uppercase">16 - 30 Hari</p>
            <p className="text-lg font-black text-amber-950">{formatRupiah(data.aging_summary.days_16_30)}</p>
          </div>

          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-1" data-testid="aging-bucket-days-31-60">
            <p className="text-xs font-bold text-orange-700 uppercase">31 - 60 Hari</p>
            <p className="text-lg font-black text-orange-900">{formatRupiah(data.aging_summary.days_31_60)}</p>
          </div>

          <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-1" data-testid="aging-bucket-over-60">
            <p className="text-xs font-bold text-red-700 uppercase">&gt; 60 Hari</p>
            <p className="text-lg font-black text-red-900">{formatRupiah(data.aging_summary.over_60_days)}</p>
          </div>
        </div>
      </div>

      {/* Customer Debt Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4" data-testid="report-customer-debt">
        <h2 className="text-lg font-bold text-gray-900">Piutang per Pelanggan</h2>

        {data.receivables_by_customer.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Tidak ada pelanggan dengan saldo piutang.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th scope="col" className="p-3">Nama Pelanggan</th>
                  <th scope="col" className="p-3">Jumlah Transaksi Terbuka</th>
                  <th scope="col" className="p-3 text-right">Total Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.receivables_by_customer.map((cust) => (
                  <tr key={cust.customer_id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-medium text-gray-900">{cust.customer_name}</td>
                    <td className="p-3 font-mono">{cust.open_receivables_count}</td>
                    <td className="p-3 text-right font-bold text-gray-900">{formatRupiah(cust.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
