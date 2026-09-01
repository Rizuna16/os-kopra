import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useBusiness } from "../business/BusinessContext";
import { getOwnerDashboard, type DashboardData } from "../dashboard/dashboardService";

export function OwnerDashboard() {
  const { user, logout } = useAuth();
  const { currentBusinessId, currentBusiness, businesses, selectBusiness } = useBusiness();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBusinessDropdownOpen, setIsBusinessDropdownOpen] = useState(false);

  const location = useLocation();

  const loadData = () => {
    if (!currentBusinessId) return;
    setLoading(true);
    setError(null);
    getOwnerDashboard(currentBusinessId)
      .then((res) => {
        setData(res);
        setLastUpdated(new Date());
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

  const ownerName = user?.first_name || user?.last_name ? `${user.first_name} ${user.last_name}`.trim() : user?.email || "Owner";
  const businessName = currentBusiness?.name || "Business Context";

  // Sidebar content component to avoid duplication between desktop sidebar and mobile drawer
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-md shadow-indigo-600/30">
            K
          </div>
          <div>
            <span data-testid="sidebar-logo" className="text-lg font-black tracking-tight text-white block">
              KOPERA
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block">
              Retail Operating System
            </span>
          </div>
        </div>
      </div>

      {/* Business Switcher */}
      <div className="p-4 border-b border-slate-800 relative">
        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 block px-1">
          Active Business Unit
        </label>
        <button
          onClick={() => setIsBusinessDropdownOpen(!isBusinessDropdownOpen)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-bold transition-all shadow-sm"
        >
          <div className="flex items-center gap-2.5 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
            <span className="truncate">{businessName}</span>
          </div>
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isBusinessDropdownOpen && (
          <div className="absolute top-full left-4 right-4 mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden py-1">
            {businesses.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  selectBusiness(b.id);
                  setIsBusinessDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center justify-between hover:bg-slate-700 transition-colors ${
                  b.id === currentBusinessId ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500" : "text-slate-300"
                }`}
              >
                <span className="truncate">{b.name}</span>
                {b.id === currentBusinessId && <span className="text-[10px] font-bold text-indigo-400">ACTIVE</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6 text-xs font-medium">
        {/* MAIN */}
        <div className="space-y-1.5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Main</p>
          
          <Link
            to="/app/dashboard"
            data-testid="sidebar-nav-dashboard"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              location.pathname === "/app/dashboard"
                ? "bg-indigo-600/15 text-indigo-400 font-bold border-l-4 border-indigo-500 active-menu-item shadow-sm"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>Dashboard</span>
          </Link>

          <Link
            to="/products"
            data-testid="sidebar-nav-produk"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>Produk</span>
          </Link>

          <Link
            to="/products"
            data-testid="sidebar-nav-inventory"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Inventory</span>
          </Link>

          <Link
            to="/sales"
            data-testid="sidebar-nav-penjualan"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span>Penjualan</span>
          </Link>

          <Link
            to="/purchasing"
            data-testid="sidebar-nav-pembelian"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Pembelian</span>
          </Link>

          <Link
            to="/customers"
            data-testid="sidebar-nav-customer"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Customer</span>
          </Link>

          <Link
            to="/suppliers"
            data-testid="sidebar-nav-supplier"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span>Supplier</span>
          </Link>
        </div>

        {/* MANAGEMENT */}
        <div className="space-y-1.5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Management</p>
          
          <Link
            to="/finance/accounts"
            data-testid="sidebar-nav-keuangan"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Keuangan</span>
          </Link>

          <Link
            to="/reports/overview"
            data-testid="sidebar-nav-laporan"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            <span>Laporan</span>
          </Link>

          <Link
            to="/stores"
            data-testid="sidebar-nav-toko-online"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span>Toko Online</span>
          </Link>

          <Link
            to="/notifications"
            data-testid="sidebar-nav-notifikasi"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>Notifikasi</span>
          </Link>
        </div>
      </nav>

      {/* Bottom Profile & Settings */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <Link
          to="/settings"
          data-testid="sidebar-nav-pengaturan"
          onClick={() => setIsMobileMenuOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all text-xs font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Pengaturan</span>
        </Link>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-bold text-white truncate" data-testid="sidebar-user-name">{ownerName}</p>
            <p className="text-[10px] text-slate-400 truncate" data-testid="sidebar-user-email">{user?.email || "owner@email.com"}</p>
          </div>
          <button
            onClick={() => void logout()}
            data-testid="sidebar-logout-btn"
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 transition-colors"
            title="Logout"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div data-testid="dashboard-loading" className="min-h-screen bg-slate-50 flex animate-pulse">
        <div className="hidden lg:block w-64 bg-slate-900 h-screen sticky top-0" />
        <div className="flex-1 flex flex-col min-h-screen">
          <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
            <div className="h-4 bg-slate-200 rounded-full w-40" />
            <div className="h-8 bg-slate-200 rounded-xl w-24" />
          </div>
          <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 h-36" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 h-36" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 h-72" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="dashboard-error" className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-3xl border border-rose-100 p-8 max-w-md w-full text-center space-y-6 shadow-xl shadow-rose-900/5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 ring-8 ring-rose-50/50">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Dashboard Tidak Dapat Dimuat</h2>
            <p className="text-sm text-slate-500">{error}</p>
          </div>
          <button
            onClick={loadData}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20 text-sm active:scale-[0.98]"
          >
            Coba Lagi
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
      <div data-testid="dashboard-empty" className="min-h-screen bg-slate-50 flex">
        <aside className="hidden lg:block w-64 h-screen sticky top-0 flex-shrink-0">
          <SidebarContent />
        </aside>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-slate-200 sticky top-0 z-20 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                data-testid="mobile-menu-burger-btn"
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-lg font-black text-slate-900">Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              <span data-testid="topbar-business-name" className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg shadow-sm">
                {businessName}
              </span>
            </div>
          </header>
          <main className="p-6 sm:p-10 flex items-center justify-center flex-1">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-xl w-full text-center space-y-6 shadow-xl shadow-slate-900/5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 ring-8 ring-indigo-50/50">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Belum Ada Aktivitas Bisnis</h2>
                <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                  Mulai dengan menambahkan produk atau mencatat penjualan pertama Anda untuk mengaktifkan command center.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <Link
                  to="/products/new"
                  data-testid="quick-action-tambah-produk"
                  className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-sm w-full shadow-lg shadow-indigo-600/20"
                >
                  Tambah Produk Pertama
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Calculate percentages for snapshots
  const salesTotal = data?.overview?.sales?.total || 1;
  const salesCompleted = data?.overview?.sales?.completed || 0;
  const salesVoided = data?.overview?.sales?.voided || 0;
  const salesDraft = data?.overview?.sales?.draft || 0;
  const salesCompletedPct = Math.min(100, Math.round((salesCompleted / (salesTotal || 1)) * 100));
  const salesVoidedPct = Math.min(100, Math.round((salesVoided / (salesTotal || 1)) * 100));
  const salesDraftPct = Math.max(0, 100 - salesCompletedPct - salesVoidedPct);

  const poTotal = data?.overview?.purchasing?.total || 1;
  const poConfirmed = data?.overview?.purchasing?.confirmed || 0;
  const poCancelled = data?.overview?.purchasing?.cancelled || 0;
  const poDraft = data?.overview?.purchasing?.draft || 0;
  const poConfirmedPct = Math.min(100, Math.round((poConfirmed / (poTotal || 1)) * 100));
  const poCancelledPct = Math.min(100, Math.round((poCancelled / (poTotal || 1)) * 100));
  const poDraftPct = Math.max(0, 100 - poConfirmedPct - poCancelledPct);

  const debitVal = parseFloat(data?.overview?.finance?.journal_entry?.DEBIT || "0");
  const creditVal = parseFloat(data?.overview?.finance?.journal_entry?.CREDIT || "0");
  const maxFin = Math.max(debitVal, creditVal, 1);
  const debitPct = Math.min(100, Math.round((debitVal / maxFin) * 100));
  const creditPct = Math.min(100, Math.round((creditVal / maxFin) * 100));

  return (
    <div className="min-h-screen bg-slate-100/60 flex">
      {/* 1. SIDEBAR — Desktop */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 flex-shrink-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            data-testid="mobile-menu-backdrop"
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <aside
            data-testid="mobile-drawer"
            className="relative flex flex-col w-72 max-w-[85vw] bg-slate-900 text-slate-300 h-full shadow-2xl z-10"
          >
            <div className="absolute top-4 right-4 z-20">
              <button
                data-testid="mobile-menu-close-btn"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 2. TOPBAR */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              data-testid="mobile-menu-burger-btn"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">Dashboard</h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">Ringkasan kondisi bisnis Anda hari ini</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span data-testid="topbar-business-name" className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-sm">
              {businessName}
            </span>
            <Link
              to="/notifications"
              data-testid="topbar-notification-btn"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors relative"
              title="Notifikasi"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </Link>
            <button
              data-testid="topbar-refresh-btn"
              onClick={loadData}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Refresh Data"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
              </svg>
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                {ownerName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* DASHBOARD CONTENT */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
          
          {/* SECTION 1 — HERO / BUSINESS CONTEXT */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                    Owner Command Center
                  </span>
                  <span data-testid="dashboard-business-name" className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-900 text-white shadow-sm">
                    {businessName}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    BUSINESS ACTIVE
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Selamat datang kembali, <span data-testid="dashboard-owner-name">{ownerName}</span></p>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Executive Operations Dashboard
                  </h1>
                  <p className="text-xs text-slate-500">
                    Pantau kesehatan operasional bisnis Anda dalam satu layar secara real-time.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start lg:self-center">
                {lastUpdated && (
                  <span className="text-xs text-slate-400 hidden sm:inline-block font-medium">
                    Updated: {lastUpdated.toLocaleTimeString("id-ID")}
                  </span>
                )}
                <button
                  data-testid="dashboard-refresh-btn"
                  onClick={loadData}
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-200 shadow-sm transition-all duration-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 active:scale-95"
                  title="Segarkan Data"
                >
                  <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
                  </svg>
                  <span>Refresh Data</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2 — EXECUTIVE KPI */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            
            {/* Card 1: Total Omzet */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Omzet</span>
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-105 transition-transform duration-200">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="py-2.5 space-y-0.5">
                <h3 data-testid="kpi-total-omzet" className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {data?.executive.totalOmzet}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Pendapatan dari penjualan selesai</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-indigo-600">
                <span>Verified Revenue</span>
                <span>Real-time</span>
              </div>
            </div>

            {/* Card 2: Total Penjualan */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Penjualan</span>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform duration-200">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
              <div className="py-2.5 space-y-0.5">
                <h3 data-testid="kpi-total-penjualan" className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {data?.executive.totalPenjualan}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Transaksi selesai</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-emerald-600">
                <span>Completed Orders</span>
                <span>Active POS</span>
              </div>
            </div>

            {/* Card 3: Total Pengeluaran */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pengeluaran</span>
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-105 transition-transform duration-200">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="py-2.5 space-y-0.5">
                <h3 data-testid="kpi-total-pengeluaran" className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {data?.executive.totalPengeluaran}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Pengeluaran tercatat</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-rose-600">
                <span>Expense Tracking</span>
                <span>Audited</span>
              </div>
            </div>

            {/* Card 4: Total Produk */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Produk</span>
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform duration-200">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
              <div className="py-2.5 space-y-0.5">
                <h3 data-testid="kpi-total-produk" className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {data?.executive.totalProduk}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Produk dalam katalog</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-amber-600">
                <span>Catalog Inventory</span>
                <span>Active SKUs</span>
              </div>
            </div>

            {/* Card 5: Estimasi Laba */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimasi Laba</span>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform duration-200">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="py-2.5 space-y-0.5">
                <h3 data-testid="kpi-estimasi-laba" className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {data?.executive.estimasiLaba}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Laba bersih bersifat estimasi</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-emerald-600">
                <span>Net Profit</span>
                <span>Based on flat cost</span>
              </div>
            </div>

          </div>

          {/* SECTION 3 — OPERATIONAL PULSE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Operational Pulse</h2>
                <p className="text-[11px] text-slate-500">Analisis menyeluruh modul Penjualan, Pembelian, dan Keuangan</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/70 text-slate-700">
                Command Feed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Panel 1: Penjualan */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Penjualan</h3>
                        <p className="text-[10px] text-slate-400 font-medium">POS & Transaksi Retail</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-bold rounded-lg">
                      {data?.overview?.sales?.total} Total
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Completed</span>
                      <span data-testid="summary-sales-completed" className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {data?.overview?.sales?.completed}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Voided</span>
                      <span data-testid="summary-sales-voided" className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                        {data?.overview?.sales?.voided}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Draft</span>
                      <span data-testid="summary-sales-draft" className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {data?.overview?.sales?.draft}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Revenue</span>
                      <span className="font-bold text-indigo-600">Rp {data?.overview?.sales?.revenue}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500 font-medium">Loyalty Earned</span>
                      <span className="font-bold text-amber-600">Rp {data?.overview?.sales?.loyalty_earned}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden" data-testid="summary-sales-total">{data?.overview?.sales?.total}</div>

                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>Sales Distribution</span>
                    <span>{salesCompletedPct}% Completed</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div style={{ width: `${salesCompletedPct}%` }} className="bg-emerald-500 h-full" title="Completed" />
                    <div style={{ width: `${salesVoidedPct}%` }} className="bg-rose-500 h-full" title="Voided" />
                    <div style={{ width: `${salesDraftPct}%` }} className="bg-slate-400 h-full" title="Draft" />
                  </div>
                </div>
              </div>

              {/* Panel 2: Pembelian */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Pembelian</h3>
                        <p className="text-[10px] text-slate-400 font-medium">Purchase Order & Supplier</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-lg">
                      {data?.overview?.purchasing?.total} Total
                    </span>
                  </div>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Confirmed</span>
                      <span data-testid="summary-purchasing-confirmed" className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {data?.overview?.purchasing?.confirmed}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Cancelled</span>
                      <span data-testid="summary-purchasing-cancelled" className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                        {data?.overview?.purchasing?.cancelled}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Draft</span>
                      <span data-testid="summary-purchasing-draft" className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {data?.overview?.purchasing?.draft}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-500 font-medium">Total Cost</span>
                      <span className="font-bold text-rose-600">Rp {data?.overview?.purchasing?.cost}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden" data-testid="summary-purchasing-total">{data?.overview?.purchasing?.total}</div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-[11px] font-bold text-slate-500">
                    <span>Purchasing Snapshot</span>
                    <span>{poConfirmedPct}% Confirmed</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div style={{ width: `${poConfirmedPct}%` }} className="bg-emerald-500 h-full" title="Confirmed" />
                    <div style={{ width: `${poCancelledPct}%` }} className="bg-rose-500 h-full" title="Cancelled" />
                    <div style={{ width: `${poDraftPct}%` }} className="bg-slate-400 h-full" title="Draft" />
                  </div>
                </div>
              </div>

              {/* Panel 3: Keuangan */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Keuangan</h3>
                        <p className="text-[11px] text-slate-400 font-medium">Expense & Journal Ledger</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg">
                      {data?.overview?.finance?.journal.POSTED} Posted
                    </span>
                  </div>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Total Expense</span>
                      <span data-testid="summary-finance-expense" className="font-bold text-rose-600">Rp {data?.overview?.finance?.expense_total}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Journal Posted</span>
                      <span data-testid="summary-finance-journal-posted" className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {data?.overview?.finance?.journal.POSTED}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Journal Draft / Rev</span>
                      <span className="font-bold text-slate-600">{data?.overview?.finance?.journal.DRAFT} / {data?.overview?.finance?.journal.REVERSED}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Total Debit</span>
                      <span data-testid="summary-finance-debit" className="font-bold text-slate-900">Rp {data?.overview?.finance?.journal_entry.DEBIT}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-500 font-medium">Total Credit</span>
                      <span data-testid="summary-finance-credit" className="font-bold text-slate-900">Rp {data?.overview?.finance?.journal_entry.CREDIT}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-[11px] font-bold text-slate-500">
                    <span>Balance Snapshot</span>
                    <span>Debit vs Credit</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div style={{ width: `${debitPct}%` }} className="bg-indigo-500 h-full" title="Debit" />
                    <div style={{ width: `${creditPct}%` }} className="bg-purple-500 h-full" title="Credit" />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 4 — ATTENTION CENTER, SECTION 5 — ONLINE STORE & SECTION 6 — QUICK ACTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Left 2 Columns */}
            <div className="lg:col-span-2 space-y-5">
              
              {/* SECTION 4 — ATTENTION CENTER */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Perlu Perhatian</h2>
                      <p className="text-[10px] text-slate-400 font-medium">Notification & Operational Alerts</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg">
                    {data?.notifications?.length || 0} Alerts
                  </span>
                </div>

                <div className="divide-y divide-slate-50">
                  {data?.notifications.map((notif) => (
                    <div key={notif.id} className="py-2.5 flex items-start justify-between gap-3 group hover:bg-slate-50/60 px-2.5 rounded-xl transition-colors">
                      <div className="flex items-start gap-2.5">
                        {!notif.is_read && (
                          <span
                            data-testid={`notif-${notif.id}-unread-badge`}
                            className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600 mt-1 flex-shrink-0 shadow-sm"
                            title="Belum dibaca"
                          />
                        )}
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors">{notif.title}</p>
                          <p className="text-[11px] text-slate-500 leading-relaxed">{notif.message}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold flex-shrink-0 bg-slate-100 px-2 py-0.5 rounded-md">
                        {new Date(notif.created_at).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                  ))}
                  {(!data?.notifications || data.notifications.length === 0) && (
                    <div className="py-8 text-center space-y-1.5">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="font-bold text-slate-900 text-xs">Semua Terlihat Baik</p>
                      <p className="text-[11px] text-slate-400">Tidak ada perhatian khusus atau notifikasi tertunda.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 5 — ONLINE STORE */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Toko Online</h2>
                      <p className="text-[10px] text-slate-400 font-medium">E-commerce storefront channel</p>
                    </div>
                  </div>
                  <Link
                    to="/stores/create"
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    + Buat Toko Baru
                  </Link>
                </div>

                <div className="divide-y divide-slate-50">
                  {data?.onlineStores.map((store) => (
                    <div key={store.id} className="py-3 flex items-center justify-between group">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors">{store.name}</p>
                        <p className="text-[11px] text-slate-400 font-medium">/{store.slug}</p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span
                          data-testid={`store-${store.id}-status`}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                            store.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {store.is_active ? "Active" : "Inactive"}
                        </span>
                        <Link
                          to={`/stores`}
                          className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors shadow-sm"
                        >
                          Buka Toko
                        </Link>
                      </div>
                    </div>
                  ))}
                  {(!data?.onlineStores || data.onlineStores.length === 0) && (
                    <div className="py-6 text-center space-y-2">
                      <p className="text-xs font-semibold text-slate-500">Toko online belum tersedia</p>
                      <Link
                        to="/stores/create"
                        className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 px-3.5 rounded-lg text-xs shadow-md transition-all"
                      >
                        Buat Toko Online
                      </Link>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* SECTION 6 — QUICK ACTIONS */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3 h-fit">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Aksi Cepat</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Executive quick actions</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-0.5">
                <Link
                  to="/products/new"
                  data-testid="quick-action-tambah-produk"
                  className="flex items-center justify-between bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-3.5 rounded-xl transition-all duration-200 text-xs shadow-md shadow-indigo-600/15 group"
                >
                  <div className="space-y-0.5">
                    <span className="block font-bold">Tambah Produk</span>
                    <p className="text-[10px] text-indigo-100 font-normal">Tambahkan item baru ke katalog</p>
                  </div>
                  <svg className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </Link>

                <Link
                  to="/sales/new"
                  data-testid="quick-action-tambah-penjualan"
                  className="flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 text-slate-800 border border-slate-200/80 font-bold py-2.5 px-3.5 rounded-xl transition-all duration-200 text-xs shadow-sm group"
                >
                  <div className="space-y-0.5">
                    <span className="block font-bold">Tambah Penjualan</span>
                    <p className="text-[10px] text-slate-400 font-normal">Catat transaksi penjualan</p>
                  </div>
                  <svg className="h-3.5 w-3.5 text-slate-400 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  to="/purchasing/new"
                  data-testid="quick-action-tambah-pembelian"
                  className="flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 text-slate-800 border border-slate-200/80 font-bold py-2.5 px-3.5 rounded-xl transition-all duration-200 text-xs shadow-sm group"
                >
                  <div className="space-y-0.5">
                    <span className="block font-bold">Tambah Pembelian</span>
                    <p className="text-[10px] text-slate-400 font-normal">Buat purchase order baru</p>
                  </div>
                  <svg className="h-3.5 w-3.5 text-slate-400 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  to="/customers/new"
                  data-testid="quick-action-tambah-customer"
                  className="flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 text-slate-800 border border-slate-200/80 font-bold py-2.5 px-3.5 rounded-xl transition-all duration-200 text-xs shadow-sm group"
                >
                  <div className="space-y-0.5">
                    <span className="block font-bold">Tambah Customer</span>
                    <p className="text-[10px] text-slate-400 font-normal">Daftarkan pelanggan baru</p>
                  </div>
                  <svg className="h-3.5 w-3.5 text-slate-400 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  to="/suppliers/new"
                  data-testid="quick-action-tambah-supplier"
                  className="flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 text-slate-800 border border-slate-200/80 font-bold py-2.5 px-3.5 rounded-xl transition-all duration-200 text-xs shadow-sm group"
                >
                  <div className="space-y-0.5">
                    <span className="block font-bold">Tambah Supplier</span>
                    <p className="text-[10px] text-slate-400 font-normal">Tambahkan data supplier</p>
                  </div>
                  <svg className="h-3.5 w-3.5 text-slate-400 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  to="/onboarding"
                  data-testid="quick-action-tambah-usaha"
                  className="flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 text-slate-800 border border-slate-200/80 font-bold py-2.5 px-3.5 rounded-xl transition-all duration-200 text-xs shadow-sm group"
                >
                  <div className="space-y-0.5">
                    <span className="block font-bold">Registrasi Usaha Baru</span>
                    <p className="text-[10px] text-slate-400 font-normal">Buka entitas usaha retail baru</p>
                  </div>
                  <svg className="h-3.5 w-3.5 text-slate-400 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  to="/stores/create"
                  data-testid="quick-action-buka-online-store"
                  className="flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 text-slate-800 border border-slate-200/80 font-bold py-2.5 px-3.5 rounded-xl transition-all duration-200 text-xs shadow-sm group"
                >
                  <div className="space-y-0.5">
                    <span className="block font-bold">Buka Toko Online</span>
                    <p className="text-[10px] text-slate-400 font-normal">Kelola etalase storefront</p>
                  </div>
                  <svg className="h-3.5 w-3.5 text-slate-400 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
