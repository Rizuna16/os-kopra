import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getOwnerDashboard, type DashboardData } from "../dashboard/dashboardService";

export function OwnerDashboard() {
  const { currentBusinessId } = useBusiness();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    if (!currentBusinessId) return;
    setLoading(true);
    setError(null);
    getOwnerDashboard(currentBusinessId)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err.message || "Failed to load dashboard data");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusinessId]);

  if (loading) {
    return (
      <div data-testid="dashboard-loading" className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-500 text-sm">Loading dashboard context...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="dashboard-error" className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-red-100 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-600 mb-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Unable to load dashboard</h2>
          <p className="text-gray-500 text-sm">{error}</p>
          <button
            onClick={loadData}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-xl transition duration-150 ease-in-out text-sm"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const isEmpty =
    data &&
    parseFloat(data.executive.totalOmzet || "0") === 0 &&
    data.executive.totalPenjualan === 0 &&
    parseFloat(data.executive.totalPengeluaran || "0") === 0 &&
    data.executive.totalProduk === 0 &&
    (!data.notifications || data.notifications.length === 0) &&
    (!data.onlineStores || data.onlineStores.length === 0);

  if (isEmpty) {
    return (
      <div data-testid="dashboard-empty" className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-400 mb-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Your dashboard is empty</h2>
          <p className="text-gray-500 text-sm">Start recording transactions, products, or setup an online store to see metrics populate here.</p>
          <div className="pt-2">
            <Link
              to="/products/new"
              data-testid="quick-action-tambah-produk"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-xl transition duration-150 ease-in-out text-sm w-full"
            >
              Add First Product
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link
              to="/sales/new"
              data-testid="quick-action-tambah-penjualan"
              className="text-gray-700 bg-gray-50 hover:bg-gray-100 py-2 rounded-xl text-xs font-semibold"
            >
              Record Sale
            </Link>
            <Link
              to="/purchasing/new"
              data-testid="quick-action-tambah-pembelian"
              className="text-gray-700 bg-gray-50 hover:bg-gray-100 py-2 rounded-xl text-xs font-semibold"
            >
              Record Purchase
            </Link>
            <Link
              to="/customers/new"
              data-testid="quick-action-tambah-customer"
              className="text-gray-700 bg-gray-50 hover:bg-gray-100 py-2 rounded-xl text-xs font-semibold"
            >
              Add Customer
            </Link>
            <Link
              to="/suppliers/new"
              data-testid="quick-action-tambah-supplier"
              className="text-gray-700 bg-gray-50 hover:bg-gray-100 py-2 rounded-xl text-xs font-semibold"
            >
              Add Supplier
            </Link>
            <Link
              to="/onboarding"
              data-testid="quick-action-tambah-usaha"
              className="text-gray-700 bg-gray-50 hover:bg-gray-100 py-2 rounded-xl text-xs font-semibold"
            >
              Add Business
            </Link>
            <Link
              to="/stores/create"
              data-testid="quick-action-buka-online-store"
              className="text-gray-700 bg-gray-50 hover:bg-gray-100 py-2 rounded-xl text-xs font-semibold"
            >
              Online Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header Summary */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Retail OS Control Center</h1>
            <p className="text-sm text-gray-500">Monitor and orchestrate your business operations in real-time.</p>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Omzet */}
          <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Omzet</p>
                <h3 data-testid="kpi-total-omzet" className="text-xl font-bold text-gray-900 mt-1 truncate">
                  {data?.executive.totalOmzet}
                </h3>
              </div>
            </div>
          </div>

          {/* Card 2: Total Penjualan */}
          <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Penjualan</p>
                <h3 data-testid="kpi-total-penjualan" className="text-xl font-bold text-gray-900 mt-1 truncate">
                  {data?.executive.totalPenjualan}
                </h3>
              </div>
            </div>
          </div>

          {/* Card 3: Total Pengeluaran */}
          <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Pengeluaran</p>
                <h3 data-testid="kpi-total-pengeluaran" className="text-xl font-bold text-gray-900 mt-1 truncate">
                  {data?.executive.totalPengeluaran}
                </h3>
              </div>
            </div>
          </div>

          {/* Card 4: Total Produk */}
          <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Produk</p>
                <h3 data-testid="kpi-total-produk" className="text-xl font-bold text-gray-900 mt-1 truncate">
                  {data?.executive.totalProduk}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Visibility & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Online Store & Notifications */}
          <div className="lg:col-span-2 space-y-6">
            {/* Online Store Summary */}
            <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900">Online Channel Integration</h2>
              <p className="text-sm text-gray-500 mt-1">Status and catalogs published to KOPERA storefront.</p>
              <div className="mt-4 divide-y divide-gray-100">
                {data?.onlineStores.map((store) => (
                  <div key={store.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{store.name}</p>
                      <p className="text-xs text-gray-400">/{store.slug}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${store.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {store.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
                {(!data?.onlineStores || data.onlineStores.length === 0) && (
                  <p className="text-sm text-gray-400 py-4 text-center">No online stores registered.</p>
                )}
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900">Critical Alerts & Notifications</h2>
              <p className="text-sm text-gray-500 mt-1">Recent updates requiring your direct attention.</p>
              <div className="mt-4 divide-y divide-gray-100">
                {data?.notifications.map((notif) => (
                  <div key={notif.id} className="py-3 flex flex-col space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900 text-sm">{notif.title}</p>
                      <span className="text-[10px] text-gray-400">{new Date(notif.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-gray-500">{notif.message}</p>
                  </div>
                ))}
                {(!data?.notifications || data.notifications.length === 0) && (
                  <p className="text-sm text-gray-400 py-4 text-center">No recent alerts.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Quick Actions */}
          <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-6 h-fit space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
            <p className="text-sm text-gray-500">Accelerate your daily operations with minimal friction.</p>
            <div className="flex flex-col space-y-2 pt-2">
              <Link
                to="/products/new"
                data-testid="quick-action-tambah-produk"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl text-center transition duration-150 ease-in-out text-sm"
              >
                Add Product
              </Link>
              <Link
                to="/sales/new"
                data-testid="quick-action-tambah-penjualan"
                className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-xl text-center transition duration-150 ease-in-out text-sm"
              >
                New Sale
              </Link>
              <Link
                to="/purchasing/new"
                data-testid="quick-action-tambah-pembelian"
                className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-xl text-center transition duration-150 ease-in-out text-sm"
              >
                New Purchase Order
              </Link>
              <Link
                to="/customers/new"
                data-testid="quick-action-tambah-customer"
                className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-xl text-center transition duration-150 ease-in-out text-sm"
              >
                Add Customer
              </Link>
              <Link
                to="/suppliers/new"
                data-testid="quick-action-tambah-supplier"
                className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-xl text-center transition duration-150 ease-in-out text-sm"
              >
                Add Supplier
              </Link>
              <Link
                to="/onboarding"
                data-testid="quick-action-tambah-usaha"
                className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-xl text-center transition duration-150 ease-in-out text-sm"
              >
                Register New Business
              </Link>
              <Link
                to="/stores/create"
                data-testid="quick-action-buka-online-store"
                className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-xl text-center transition duration-150 ease-in-out text-sm"
              >
                Open Online Store
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
