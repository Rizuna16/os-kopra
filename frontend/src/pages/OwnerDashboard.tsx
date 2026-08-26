import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useBusiness } from "../business/BusinessContext";
import { getOwnerDashboard, type DashboardData } from "../dashboard/dashboardService";

export function OwnerDashboard() {
  const { user } = useAuth();
  const { currentBusinessId, currentBusiness } = useBusiness();
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
      <div data-testid="dashboard-loading" className="min-h-screen bg-gray-50 py-8 animate-pulse">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header Skeleton */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm h-32 flex flex-col justify-between">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
          
          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm h-32 flex items-center justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-2xl"></div>
              </div>
            ))}
          </div>

          {/* Operational Summary Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm h-64 space-y-4">
                <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                <div className="space-y-3 pt-4">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="dashboard-error" className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-3xl border border-red-100 p-8 max-w-md w-full text-center space-y-6 shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-red-50 text-red-600">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900">Gagal Memuat Dashboard</h2>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
          <button
            onClick={loadData}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition duration-150 shadow-sm text-sm"
          >
            Coba Lagi (Retry Loading)
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
        <div className="bg-white rounded-3xl border border-gray-100 p-8 max-w-lg w-full text-center space-y-6 shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900">Dashboard Anda Masih Kosong</h2>
            <p className="text-sm text-gray-500">
              Mulai rekam transaksi penjualan, buat produk, atau siapkan integrasi toko online untuk melihat statistik kinerja bisnis Anda di sini.
            </p>
          </div>
          
          <div className="pt-2 border-t border-gray-50">
            <Link
              to="/products/new"
              data-testid="quick-action-tambah-produk"
              className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition duration-150 ease-in-out text-sm w-full shadow-sm"
            >
              Tambah Produk Pertama
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link
              to="/sales/new"
              data-testid="quick-action-tambah-penjualan"
              className="text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 py-2.5 rounded-xl text-xs font-semibold shadow-sm text-center"
            >
              Catat Penjualan
            </Link>
            <Link
              to="/purchasing/new"
              data-testid="quick-action-tambah-pembelian"
              className="text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 py-2.5 rounded-xl text-xs font-semibold shadow-sm text-center"
            >
              Catat Pembelian
            </Link>
            <Link
              to="/customers/new"
              data-testid="quick-action-tambah-customer"
              className="text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 py-2.5 rounded-xl text-xs font-semibold shadow-sm text-center"
            >
              Tambah Customer
            </Link>
            <Link
              to="/suppliers/new"
              data-testid="quick-action-tambah-supplier"
              className="text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 py-2.5 rounded-xl text-xs font-semibold shadow-sm text-center"
            >
              Tambah Supplier
            </Link>
            <Link
              to="/onboarding"
              data-testid="quick-action-tambah-usaha"
              className="text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 py-2.5 rounded-xl text-xs font-semibold shadow-sm text-center"
            >
              Registrasi Usaha
            </Link>
            <Link
              to="/stores/create"
              data-testid="quick-action-buka-online-store"
              className="text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 py-2.5 rounded-xl text-xs font-semibold shadow-sm text-center"
            >
              Toko Online
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Summary */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                Executive Command Center
              </span>
              <span data-testid="dashboard-business-name" className="text-sm font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                {currentBusiness?.name || "Business Context"}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Selamat Datang, <span data-testid="dashboard-owner-name" className="text-indigo-600">{user?.first_name || user?.last_name ? `${user.first_name} ${user.last_name}`.trim() : user?.email || "Owner"}</span>
            </h1>
            <p className="text-sm text-gray-500">
              Pantau dan kelola seluruh aktivitas operasional toko Anda hari ini secara real-time.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-center">
            <button
              data-testid="dashboard-refresh-btn"
              onClick={loadData}
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-4 rounded-xl border border-gray-200 shadow-sm transition-all duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="Segarkan Data"
            >
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
              </svg>
              Refresh Data
            </button>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Omzet */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center justify-between transition-all hover:shadow-md duration-200">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Omzet</p>
              <h3 data-testid="kpi-total-omzet" className="text-2xl font-black text-gray-900 tracking-tight">
                {data?.executive.totalOmzet}
              </h3>
              <p className="text-[11px] text-gray-400 font-medium">Omzet akumulasi penjualan selesai</p>
            </div>
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Card 2: Total Penjualan */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center justify-between transition-all hover:shadow-md duration-200">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Penjualan</p>
              <h3 data-testid="kpi-total-penjualan" className="text-2xl font-black text-gray-900 tracking-tight">
                {data?.executive.totalPenjualan}
              </h3>
              <p className="text-[11px] text-gray-400 font-medium">Transaksi penjualan selesai</p>
            </div>
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>

          {/* Card 3: Total Pengeluaran */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center justify-between transition-all hover:shadow-md duration-200">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Pengeluaran</p>
              <h3 data-testid="kpi-total-pengeluaran" className="text-2xl font-black text-gray-900 tracking-tight">
                {data?.executive.totalPengeluaran}
              </h3>
              <p className="text-[11px] text-gray-400 font-medium">Biaya operasional & beban usaha</p>
            </div>
            <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Card 4: Total Produk */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center justify-between transition-all hover:shadow-md duration-200">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Produk</p>
              <h3 data-testid="kpi-total-produk" className="text-2xl font-black text-gray-900 tracking-tight">
                {data?.executive.totalProduk}
              </h3>
              <p className="text-[11px] text-gray-400 font-medium">Jumlah produk aktif terdaftar</p>
            </div>
            <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Operational Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card: Penjualan */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                <h2 className="text-lg font-bold text-gray-900">Ringkasan Penjualan</h2>
              </div>
              <span className="text-xs text-gray-400 font-semibold">Real-time</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">Total Transaksi</span>
                <span data-testid="summary-sales-total" className="font-bold text-gray-900">{data?.overview.sales.total}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">Selesai (Completed)</span>
                <span data-testid="summary-sales-completed" className="font-bold text-emerald-600">{data?.overview.sales.completed}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">Dibatalkan (Voided)</span>
                <span data-testid="summary-sales-voided" className="font-bold text-rose-600">{data?.overview.sales.voided}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">Draft</span>
                <span data-testid="summary-sales-draft" className="font-bold text-gray-600">{data?.overview.sales.draft}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">Total Revenue</span>
                <span className="font-bold text-indigo-600">Rp {data?.overview.sales.revenue}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-gray-500">Loyalty Earned</span>
                <span className="font-bold text-amber-600">Rp {data?.overview.sales.loyalty_earned}</span>
              </div>
            </div>
          </div>

          {/* Card: Pembelian */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
                <h2 className="text-lg font-bold text-gray-900">Ringkasan Pembelian</h2>
              </div>
              <span className="text-xs text-gray-400 font-semibold">Real-time</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">Total Purchase Orders</span>
                <span data-testid="summary-purchasing-total" className="font-bold text-gray-900">{data?.overview.purchasing.total}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">Confirmed</span>
                <span data-testid="summary-purchasing-confirmed" className="font-bold text-emerald-600">{data?.overview.purchasing.confirmed}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">Cancelled</span>
                <span data-testid="summary-purchasing-cancelled" className="font-bold text-rose-600">{data?.overview.purchasing.cancelled}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">Draft</span>
                <span data-testid="summary-purchasing-draft" className="font-bold text-gray-600">{data?.overview.purchasing.draft}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-gray-500">Total Cost</span>
                <span className="font-bold text-rose-600">Rp {data?.overview.purchasing.cost}</span>
              </div>
            </div>
          </div>

          {/* Card: Keuangan */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-rose-600 rounded-full" />
                <h2 className="text-lg font-bold text-gray-900">Ringkasan Keuangan</h2>
              </div>
              <span className="text-xs text-gray-400 font-semibold">Real-time</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">Total Pengeluaran</span>
                <span data-testid="summary-finance-expense" className="font-bold text-rose-600">Rp {data?.overview.finance.expense_total}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">Journal Posted</span>
                <span data-testid="summary-finance-journal-posted" className="font-bold text-emerald-600">{data?.overview.finance.journal.POSTED}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">Journal Draft</span>
                <span className="font-bold text-gray-600">{data?.overview.finance.journal.DRAFT}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">Journal Reversed</span>
                <span className="font-bold text-rose-600">{data?.overview.finance.journal.REVERSED}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">Total Debit (Posted)</span>
                <span data-testid="summary-finance-debit" className="font-bold text-gray-900">Rp {data?.overview.finance.journal_entry.DEBIT}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-gray-500">Total Credit (Posted)</span>
                <span data-testid="summary-finance-credit" className="font-bold text-gray-900">Rp {data?.overview.finance.journal_entry.CREDIT}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Visibility & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Online Store & Notifications */}
          <div className="lg:col-span-2 space-y-6">
            {/* Online Store Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <h2 className="text-lg font-bold text-gray-900">Integrasi Toko Online</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {data?.onlineStores.map((store) => (
                  <div key={store.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{store.name}</p>
                      <p className="text-xs text-gray-400 font-medium">/{store.slug}</p>
                    </div>
                    <span
                      data-testid={`store-${store.id}-status`}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        store.is_active
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-gray-50 text-gray-500 border border-gray-100"
                      }`}
                    >
                      {store.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))}
                {(!data?.onlineStores || data.onlineStores.length === 0) && (
                  <div className="py-6 text-center text-sm text-gray-400">
                    Belum ada toko online yang terdaftar.
                  </div>
                )}
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <h2 className="text-lg font-bold text-gray-900">Perlu Perhatian</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {data?.notifications.map((notif) => (
                  <div key={notif.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      {!notif.is_read && (
                        <span
                          data-testid={`notif-${notif.id}-unread-badge`}
                          className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0"
                          title="Belum dibaca"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{notif.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-semibold flex-shrink-0">
                      {new Date(notif.created_at).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                ))}
                {(!data?.notifications || data.notifications.length === 0) && (
                  <div className="py-6 text-center text-sm text-gray-400">
                    Tidak ada peringatan baru.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4 h-fit">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h2 className="text-lg font-bold text-gray-900">Tindakan Cepat</h2>
            </div>
            <div className="flex flex-col gap-2.5 pt-1">
              <Link
                to="/products/new"
                data-testid="quick-action-tambah-produk"
                className="flex items-center justify-between bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition duration-150 text-sm shadow-sm"
              >
                <span>Tambah Produk</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </Link>
              <Link
                to="/sales/new"
                data-testid="quick-action-tambah-penjualan"
                className="flex items-center justify-between bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-semibold py-2.5 px-4 rounded-xl transition duration-150 text-sm shadow-sm"
              >
                <span>Tambah Penjualan</span>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                to="/purchasing/new"
                data-testid="quick-action-tambah-pembelian"
                className="flex items-center justify-between bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-semibold py-2.5 px-4 rounded-xl transition duration-150 text-sm shadow-sm"
              >
                <span>Tambah Pembelian</span>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                to="/customers/new"
                data-testid="quick-action-tambah-customer"
                className="flex items-center justify-between bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-semibold py-2.5 px-4 rounded-xl transition duration-150 text-sm shadow-sm"
              >
                <span>Tambah Customer</span>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                to="/suppliers/new"
                data-testid="quick-action-tambah-supplier"
                className="flex items-center justify-between bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-semibold py-2.5 px-4 rounded-xl transition duration-150 text-sm shadow-sm"
              >
                <span>Tambah Supplier</span>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                to="/onboarding"
                data-testid="quick-action-tambah-usaha"
                className="flex items-center justify-between bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-semibold py-2.5 px-4 rounded-xl transition duration-150 text-sm shadow-sm"
              >
                <span>Registrasi Usaha Baru</span>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                to="/stores/create"
                data-testid="quick-action-buka-online-store"
                className="flex items-center justify-between bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-semibold py-2.5 px-4 rounded-xl transition duration-150 text-sm shadow-sm"
              >
                <span>Buka Toko Online</span>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
