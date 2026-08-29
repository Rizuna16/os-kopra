import { useEffect, useState, useCallback } from "react";
import { useBusiness } from "../business/BusinessContext";
import { getInventoryReport } from "../reports/reportsService";
import type { InventoryReport } from "../reports/types";

export function ReportsInventory() {
  const { currentBusinessId } = useBusiness();
  const [data, setData] = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getInventoryReport(currentBusinessId);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load inventory report");
    } finally {
      setLoading(false);
    }
  }, [currentBusinessId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const hasData = !!data && Object.keys(data).length > 0;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="reports-inventory-page">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Inventory Report</h1>
        </div>

        {error && (
          <div
            data-testid="reports-inventory-error"
            className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4"
          >
            {error}
          </div>
        )}

        {loading && (
          <div
            data-testid="reports-inventory-loading"
            className="text-sm text-gray-500 py-8 text-center"
          >
            Loading inventory report...
          </div>
        )}

        {!loading && !error && !hasData && (
          <div
            data-testid="reports-inventory-empty"
            className="text-sm text-gray-500 py-8 text-center"
          >
            No inventory data available.
          </div>
        )}

        {!loading && !error && hasData && data && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Inventory Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
              <div className="p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-500 block">Total Products</span>
                <div data-testid="inventory-total-items" className="text-xl font-bold text-gray-900 mt-1">
                  {data.total_products}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-500 block">Total Variants</span>
                <div data-testid="inventory-total-variants" className="text-xl font-bold text-gray-900 mt-1">
                  {data.total_variants}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-500 block">Total Stock Quantity</span>
                <div data-testid="inventory-total-stock" className="text-xl font-bold text-gray-900 mt-1">
                  {data.total_stock_quantity}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-500 block">Inventory Value</span>
                <div data-testid="inventory-total-value" className="text-xl font-bold text-gray-900 mt-1">
                  {data.inventory_value}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-500 block">Low Stock Count</span>
                <div data-testid="inventory-low-stock-count" className="text-xl font-bold text-gray-900 mt-1">
                  {data.low_stock_count}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
