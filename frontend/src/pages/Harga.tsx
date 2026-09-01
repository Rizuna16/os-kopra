import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Harga() {
  useEffect(() => { document.title = "KOPERA OS — Harga"; }, []);
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated";

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans" data-testid="harga-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-black tracking-tight text-blue-600" data-testid="harga-brand">
              KOPERA
            </span>
            <span className="text-xs uppercase tracking-widest px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-full">
              OS V1
            </span>
          </div>
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-600">
            <Link to="/" className="hover:text-blue-600 transition-colors">Beranda</Link>
            <Link to="/tentang" className="hover:text-blue-600 transition-colors">Tentang</Link>
            <Link to="/fitur" className="hover:text-blue-600 transition-colors">Fitur</Link>
            <Link to="/harga" className="hover:text-blue-600 transition-colors active">Harga</Link>
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
            <span>Paket Berlangganan Fleksibel</span>
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 max-w-4xl mx-auto leading-tight"
            data-testid="harga-hero-title"
          >
            Pilihan Paket Sesuai Skala Bisnis Anda
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto font-normal">
            Pilih paket yang paling sesuai dengan kebutuhan usaha ritel atau koperasi Anda. Hubungi tim KOPERA untuk informasi harga terbaru.
          </p>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section className="py-20 bg-gray-50/50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Basic */}
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Basic</h3>
              <p className="text-sm text-gray-500 mb-6">Untuk usaha skala pemula</p>
              <div className="text-3xl font-extrabold text-gray-900 mb-6">Hubungi KOPERA</div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8">
                <li>• 1 Usaha</li>
                <li>• 1 Lokasi</li>
                <li>• 2 Pengguna</li>
                <li>• Modul Inti Ritel</li>
              </ul>
              <Link
                to="/register"
                className="w-full inline-flex justify-center px-4 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                Mulai Berlangganan
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-white p-8 rounded-2xl border-2 border-blue-600 shadow-lg relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                Populer
              </span>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Pro</h3>
              <p className="text-sm text-gray-500 mb-6">Untuk usaha berkembang</p>
              <div className="text-3xl font-extrabold text-gray-900 mb-6">Hubungi KOPERA</div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8">
                <li>• 1 Usaha</li>
                <li>• Hingga 5 Lokasi</li>
                <li>• Hingga 10 Pengguna</li>
                <li>• Modul Inti + Toko Online</li>
              </ul>
              <Link
                to="/register"
                className="w-full inline-flex justify-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
              >
                Mulai Berlangganan
              </Link>
            </div>

            {/* Business */}
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Business</h3>
              <p className="text-sm text-gray-500 mb-6">Untuk jaringan usaha besar</p>
              <div className="text-3xl font-extrabold text-gray-900 mb-6">Hubungi KOPERA</div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8">
                <li>• Lokasi Lebih Banyak</li>
                <li>• Pengguna Lebih Banyak</li>
                <li>• Dukungan Prioritas</li>
                <li>• Kustomisasi Fitur</li>
              </ul>
              <Link
                to="/register"
                className="w-full inline-flex justify-center px-4 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                Hubungi Kami
              </Link>
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
            <Link to="/" className="hover:text-blue-600 transition-colors">Beranda</Link>
            <Link to="/tentang" className="hover:text-blue-600 transition-colors">Tentang</Link>
            <Link to="/fitur" className="hover:text-blue-600 transition-colors">Fitur</Link>
            <Link to="/harga" className="hover:text-blue-600 transition-colors">Harga</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}