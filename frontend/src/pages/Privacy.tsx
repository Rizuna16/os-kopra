import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Privacy() {
  useEffect(() => { document.title = "KOPERA OS — Kebijakan Privasi"; }, []);
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated";

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans" data-testid="privacy-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-black tracking-tight text-blue-600" data-testid="privacy-brand">
              KOPERA
            </span>
            <span className="text-xs uppercase tracking-widest px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-full">
              OS V1
            </span>
          </div>
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-600">
            <Link to="/" className="hover:text-blue-600 transition-colors">Beranda</Link>
            <Link to="/tentang" className="hover:text-blue-600 transition-colors">Tentang</Link>
            <Link to="/privacy" className="hover:text-blue-600 transition-colors active">Kebijakan Privasi</Link>
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
                  Daftar Sekarang
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
            <span>Perlindungan Data &amp; Kebijakan Privasi</span>
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 max-w-4xl mx-auto leading-tight"
            data-testid="privacy-hero-title"
          >
            Kebijakan Privasi KOPERA OS
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto font-normal">
            Komitmen kami dalam menjaga dan melindungi privasi serta keamanan data bisnis Anda.
          </p>
        </div>
      </section>

      {/* Privacy Content Section */}
      <section className="py-20 bg-gray-50/50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-gray-900">1. Pengumpulan Data</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              KOPERA OS mengumpulkan informasi pendaftaran seperti nama, email, serta informasi operasional usaha yang dimasukkan oleh Pengguna untuk menjalankan fungsionalitas platform.
            </p>

            <h2 className="text-xl font-bold text-gray-900">2. Penggunaan Informasi</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Informasi yang dikumpulkan digunakan semata-mata untuk menyediakan layanan, otentikasi akun, pemrosesan transaksi, serta penyediaan fitur operasional bisnis ritel Anda.
            </p>

            <h2 className="text-xl font-bold text-gray-900">3. Keamanan Data</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Kami menerapkan standar enkripsi dan kontrol akses berbasis peran (RBAC) untuk memastikan data setiap usaha terisolasi dengan aman dan tidak dapat diakses oleh pihak yang tidak berwenang.
            </p>

            <h2 className="text-xl font-bold text-gray-900">4. Kerahasiaan Data Usaha</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Data usaha dan data transaksi Anda tidak akan dijual atau dibagikan kepada pihak ketiga untuk kepentingan komersial tanpa persetujuan Anda.
            </p>
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
            <Link to="/" className="hover:text-blue-600 transition-colors">Beranda</Link>
            <Link to="/tentang" className="hover:text-blue-600 transition-colors">Tentang</Link>
            <Link to="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}