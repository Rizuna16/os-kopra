import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useBusiness } from "../business/BusinessContext";
import { getPurchasingReport } from "../reports/reportsService";
import type { PurchasingReport } from "../reports/types";

export function ReportsPurchasing() {
  const { currentBusinessId } = useBusiness();
  const [data, setData] = useState<PurchasingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchData = useCallback(
    async (from?: string, to?: string) => {
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
        };
        const res = await getPurchasingReport(currentBusinessId, filter);
        setData(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load purchasing report");
      } finally {
        setLoading(false);
      }
    },
    [currentBusinessId]
  );

  useEffect(() => {
    void fetchData(dateFrom, dateTo);
  }, [fetchData]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void fetchData(dateFrom, dateTo);
  };

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");
    void fetchData("", "");
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="reports-purchasing-page">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Purchasing Report</h1>
        </div>

        {/* Date Filter Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full sm:w-48">
              <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                id="date-from"
                type="date"
                data-testid="date-from-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
            <div className="w-full sm:w-48">
              <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                id="date-to"
                type="date"
                data-testid="date-to-input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="submit"
                data-testid="filter-submit-btn"
                className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Filter
              </button>
              <button
                type="button"
                data-testid="filter-reset-btn"
                onClick={handleReset}
                className="py-3 px-4 bg-gray-100 hover:bg-gray-200 font-medium text-sm text-gray-700 rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div
            data-testid="reports-purchasing-error"
            className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4"
          >
            {error}
          </div>
        )}

        {loading && (
          <div
            data-testid="reports-purchasing-loading"
            className="text-sm text-gray-500 py-8 text-center"
          >
            Loading purchasing report...
          </div>
        )}

        {!loading && !error && data && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Purchasing Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
              <div className="p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-500 block">Total POs</span>
                <div data-testid="purchasing-total" className="text-xl font-bold text-gray-900 mt-1">
                  {data.total}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-500 block">Confirmed POs</span>
                <div data-testid="purchasing-confirmed" className="text-xl font-bold text-green-600 mt-1">
                  {data.confirmed}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-500 block">Cancelled POs</span>
                <div data-testid="purchasing-cancelled" className="text-xl font-bold text-red-600 mt-1">
                  {data.cancelled}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-500 block">Draft POs</span>
                <div data-testid="purchasing-draft" className="text-xl font-bold text-yellow-600 mt-1">
                  {data.draft}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl sm:col-span-2 md:col-span-2">
                <span className="text-gray-500 block">Total Cost</span>
                <div data-testid="purchasing-cost" className="text-xl font-bold text-gray-900 mt-1">
                  {data.cost}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
