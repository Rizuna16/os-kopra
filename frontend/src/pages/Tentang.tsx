import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Tentang() {
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated";

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans" data-testid="tentang-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-3" aria-label="KOPERA beranda">
              <span className="text-xl font-black tracking-tight text-blue-600" data-testid="tentang-brand">
                KOPERA
              </span>
              <span className="text-xs uppercase tracking-widest px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-full">
                OS V1
              </span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-600">
            <Link to="/" className="hover:text-blue-600 transition-colors">
              Beranda
            </Link>
            <Link
              to="/tentang"
              className="text-blue-600 font-semibold transition-colors"
              aria-current="page"
            >
              Tentang
            </Link>
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

      {/* Hero / Introduction */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 bg-gradient-to-b from-blue-50/50 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-blue-700 text-xs font-semibold mb-6">
            <span>Sistem Operasi Ritel & Koperasi Indonesia</span>
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 max-w-4xl mx-auto leading-tight"
            data-testid="tentang-hero-title"
          >
            Tentang <span className="text-blue-600">KOPERA OS</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto font-normal">
            KOPERA OS adalah sistem operasi bisnis yang dirancang khusus untuk membantu pelaku
            ritel dan koperasi di Indonesia menjalankan operasional harian dalam satu platform
            terpadu.
          </p>
        </div>
      </section>

      {/* About KOPERA */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Apa Itu KOPERA OS
            </h2>
            <p className="mt-4 text-base text-gray-600">
              Satu fondasi digital untuk seluruh operasional toko dan koperasi Anda.
            </p>
          </div>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed text-center">
            KOPERA OS adalah sistem operasi untuk bisnis ritel dan koperasi di Indonesia. Platform
            ini menghubungkan pencatatan transaksi, inventori, keuangan, hingga pelaporan ke dalam
            satu ekosistem yang konsisten sehingga pemilik usaha dapat mengelola operasional tanpa
            harus merangkai banyak aplikasi yang terpisah.
          </p>
        </div>
      </section>

      {/* Mission / Problem */}
      <section className="py-20 bg-gray-50/50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Misi &amp; Visi Operasional
            </h2>
            <p className="mt-4 text-base text-gray-600">
              Masalah operasional yang kami bantu selesaikan bagi bisnis ritel Indonesia.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Masalah Operasional Harian</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Banyak pemilik toko dan koperasi masih mencatat penjualan, stok, serta keuangan
                secara manual atau menggunakan alat yang tidak terhubung. Hal ini menyebabkan
                ketidaksesuaian data, stok tidak tertmonitor, dan laporan yang lambat.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Misi KOPERA</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                KOPERA hadir untuk menyatukan operasional ritel ke dalam satu sistem yang mudah
                digunakan, agar pemilik usaha dapat mengambil keputusan berbasis data dengan lebih
                cepat dan lebih tenang.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who KOPERA Is For */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Untuk Siapa KOPERA OS
            </h2>
            <p className="mt-4 text-base text-gray-600">
              Dirancang untuk berbagai pelaku ritel dan koperasi di Indonesia.
            </p>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <li className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
              <h3 className="text-base font-bold text-gray-900 mb-2">Pemilik Toko Ritel</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Toko kelontong, minimarket, dan ritel fisik yang ingin mengelola kasir, stok, dan
                keuangan dalam satu tempat.
              </p>
            </li>
            <li className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
              <h3 className="text-base font-bold text-gray-900 mb-2">Koperasi</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Koperasi yang membutuhkan pencatatan operasional yang rapi dan dapat diaudit untuk
                anggotanya.
              </p>
            </li>
            <li className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
              <h3 className="text-base font-bold text-gray-900 mb-2">Usaha Multi-Cabang</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Bisnis dengan lebih dari satu lokasi yang memerlukan pantauan stok dan performa
                secara terpusat.
              </p>
            </li>
          </ul>
        </div>
      </section>

      {/* Product Philosophy */}
      <section className="py-20 bg-gray-50/50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Filosofi Produk
          </h2>
          <p className="mt-4 text-base text-gray-600">
            Satu sistem operasi ritel yang kohesif, bukan sekadar kumpulan alat yang terpisah.
          </p>
          <p className="mt-6 text-base sm:text-lg text-gray-600 leading-relaxed">
            KOPERA OS dibangun di atas filosofi satu ekosistem terintegrasi: setiap transaksi,
            pergerakan stok, dan catatan keuangan mengalir ke tempat yang sama. Pemilik usaha cukup
            membuka satu dasbor untuk memahami kondisi bisnisnya secara utuh.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Mulai Kelola Usaha dengan KOPERA OS
          </h2>
          <p className="mt-4 text-base text-gray-600">
            Buat akun gratis atau masuk ke akun Anda untuk memulai.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
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
            <Link
              to="/"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all text-center"
            >
              Kembali ke Beranda
            </Link>
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
            <Link to="/faq" className="hover:text-blue-600 transition-colors">FAQ</Link>
            <Link to="/kontak" className="hover:text-blue-600 transition-colors">Kontak</Link>
            <Link to="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link>
            <Link to="/login" className="hover:text-blue-600 transition-colors">Masuk</Link>
            <Link to="/register" className="hover:text-blue-600 transition-colors">Daftar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
