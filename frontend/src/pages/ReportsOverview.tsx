import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useBusiness } from "../business/BusinessContext";
import { getOverviewReport } from "../reports/reportsService";
import type { OverviewReport } from "../reports/types";

export function ReportsOverview() {
  const { currentBusinessId } = useBusiness();
  const [data, setData] = useState<OverviewReport | null>(null);
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
        const res = await getOverviewReport(currentBusinessId, filter);
        setData(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load reports overview");
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
    <div className="min-h-screen bg-gray-50" data-testid="reports-overview-page">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reports Overview</h1>
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
            data-testid="reports-overview-error"
            className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4"
          >
            {error}
          </div>
        )}

        {loading && (
          <div
            data-testid="reports-overview-loading"
            className="text-sm text-gray-500 py-8 text-center"
          >
            Loading reports overview...
          </div>
        )}

        {!loading && !error && data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sales Card */}
            <div
              data-testid="sales-metrics-card"
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4"
            >
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Sales Metrics</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Sales:</span>
                  <div data-testid="sales-total" className="font-semibold text-gray-900">
                    {data.sales.total}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Completed:</span>
                  <div data-testid="sales-completed" className="font-semibold text-green-600">
                    {data.sales.completed}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Voided:</span>
                  <div data-testid="sales-voided" className="font-semibold text-red-600">
                    {data.sales.voided}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Draft:</span>
                  <div data-testid="sales-draft" className="font-semibold text-yellow-600">
                    {data.sales.draft}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Revenue:</span>
                  <div data-testid="sales-revenue" className="font-semibold text-gray-900">
                    {data.sales.revenue}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Loyalty Earned:</span>
                  <div data-testid="sales-loyalty" className="font-semibold text-gray-900">
                    {data.sales.loyalty_earned}
                  </div>
                </div>
              </div>
            </div>

            {/* Purchasing Card */}
            <div
              data-testid="purchasing-metrics-card"
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4"
            >
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Purchasing Metrics</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total POs:</span>
                  <div data-testid="purchasing-total" className="font-semibold text-gray-900">
                    {data.purchasing.total}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Confirmed:</span>
                  <div data-testid="purchasing-confirmed" className="font-semibold text-green-600">
                    {data.purchasing.confirmed}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Cancelled:</span>
                  <div data-testid="purchasing-cancelled" className="font-semibold text-red-600">
                    {data.purchasing.cancelled}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Draft:</span>
                  <div data-testid="purchasing-draft" className="font-semibold text-yellow-600">
                    {data.purchasing.draft}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Total Cost:</span>
                  <div data-testid="purchasing-cost" className="font-semibold text-gray-900">
                    {data.purchasing.cost}
                  </div>
                </div>
              </div>
            </div>

            {/* Finance Card */}
            <div
              data-testid="finance-metrics-card"
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4"
            >
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Finance Metrics</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2">
                  <span className="text-gray-500">Expense Total:</span>
                  <div data-testid="finance-expense-total" className="font-semibold text-gray-900">
                    {data.finance.expense_total}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Journal Draft:</span>
                  <div data-testid="finance-journal-draft" className="font-semibold text-yellow-600">
                    {data.finance.journal.DRAFT}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Journal Posted:</span>
                  <div data-testid="finance-journal-posted" className="font-semibold text-green-600">
                    {data.finance.journal.POSTED}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Journal Reversed:</span>
                  <div data-testid="finance-journal-reversed" className="font-semibold text-red-600">
                    {data.finance.journal.REVERSED}
                  </div>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <span className="text-gray-500">Total Debit:</span>
                    <div data-testid="finance-debit-total" className="font-semibold text-gray-900">
                      {data.finance.journal_entry.DEBIT}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Credit:</span>
                    <div data-testid="finance-credit-total" className="font-semibold text-gray-900">
                      {data.finance.journal_entry.CREDIT}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Counts Card */}
            <div
              data-testid="counts-metrics-card"
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4"
            >
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Counts & Entities</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Customers:</span>
                  <div data-testid="counts-customers" className="font-semibold text-gray-900">
                    {data.counts.customers}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Products:</span>
                  <div data-testid="counts-products" className="font-semibold text-gray-900">
                    {data.counts.products}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Variants:</span>
                  <div data-testid="counts-variants" className="font-semibold text-gray-900">
                    {data.counts.variants}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Employees:</span>
                  <div data-testid="counts-employees" className="font-semibold text-gray-900">
                    {data.counts.employees}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Active Employees:</span>
                  <div data-testid="counts-employees-active" className="font-semibold text-green-600">
                    {data.counts.employees_active}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
