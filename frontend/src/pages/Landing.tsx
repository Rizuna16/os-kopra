import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Landing() {
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated";

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans" data-testid="landing-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-black tracking-tight text-blue-600" data-testid="landing-brand">
              KOPERA
            </span>
            <span className="text-xs uppercase tracking-widest px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-full">
              OS V1
            </span>
          </div>
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-600">
            <Link to="/tentang" className="hover:text-blue-600 transition-colors">Tentang</Link>
            <a href="#features" className="hover:text-blue-600 transition-colors">Fitur Utama</a>
            <a href="#values" className="hover:text-blue-600 transition-colors">Keunggulan</a>
          </nav>
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <Link
                to="/app"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
              >
                Buka Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
                >
                  Mulai Sekarang
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 bg-gradient-to-b from-blue-50/50 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-blue-700 text-xs font-semibold mb-6">
            <span>Sistem Operasi Bisnis Ritel & Koperasi Terpadu</span>
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 max-w-4xl mx-auto leading-tight"
            data-testid="landing-hero-title"
          >
            Kelola Usaha Ritel & Koperasi <span className="text-blue-600">Lebih Cerdas dengan KOPERA OS</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto font-normal">
            Solusi komprehensif mulai dari Point of Sale (Kasir), Manajemen Inventori multi-lokasi, Pembukuan Keuangan, hingga Laporan Bisnis Real-Time dalam satu platform terintegrasi.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {isAuthenticated ? (
              <Link
                to="/app"
                className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 transition-all text-center"
              >
                Buka Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 transition-all text-center"
                >
                  Daftar Gratis Sekarang
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all text-center"
                >
                  Masuk ke Akun
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50/50 border-t border-gray-100" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Modul Profesional untuk Operasional Bisnis Anda
            </h2>
            <p className="mt-4 text-base text-gray-600">
              Dirancang khusus untuk mendukung ritel modern dan koperasi dengan standar operasional yang handal dan aman.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xl mb-6">
                POS
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Point of Sale (Kasir)</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Transaksi cepat, manajemen shift kasir, pencetakan struk, serta dukungan berbagai metode pembayaran terintegrasi.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xl mb-6">
                INV
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Inventori & Stok</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Kontrol stok real-time, varian produk, opname stok, serta manajemen multi-gudang dan supplier yang akurat.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xl mb-6">
                FIN
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Keuangan & Pembukuan</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Pencatatan jurnal umum, akun keuangan, pengeluaran, serta laporan neraca dan laba rugi otomatis.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xl mb-6">
                REP
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Laporan Komprehensif</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Analisis penjualan, performa produk, tren pembelian, dan ringkasan keuangan dalam visualisasi yang mudah dibaca.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xl mb-6">
                NOT
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Notifikasi & Komunikasi</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Pusat notifikasi untuk pemberitahuan transaksi, status stok menipis, dan pengingat operasional penting.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xl mb-6">
                WEB
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Toko Online Terpadu</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Katalog online instan untuk toko Anda agar pelanggan dapat memesan langsung secara digital.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-2 mb-4 sm:mb-0">
            <span className="font-bold text-gray-900">KOPERA OS</span>
            <span>© {new Date().getFullYear()} KOPERA. Seluruh hak cipta dilindungi.</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/tentang" className="hover:text-blue-600 transition-colors">Tentang</Link>
            <Link to="/login" className="hover:text-blue-600 transition-colors">Masuk</Link>
            <Link to="/register" className="hover:text-blue-600 transition-colors">Daftar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
