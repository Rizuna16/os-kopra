import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function FAQ() {
  useEffect(() => { document.title = "KOPERA OS — FAQ"; }, []);
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated";

  const faqs = [
    {
      q: "Apa itu KOPERA OS?",
      a: "KOPERA OS adalah sistem operasi bisnis terpadu untuk mengelola ritel dan koperasi di Indonesia, mencakup Kasir (POS), Stok, Keuangan, Laporan, dan Toko Online.",
    },
    {
      q: "Siapa yang dapat menggunakan KOPERA?",
      a: "KOPERA OS dirancang untuk pemilik toko ritel, koperasi, minimarket, toko fashion, toko elektronik, toko bangunan, serta usaha ritel UMKM di Indonesia.",
    },
    {
      q: "Apakah dapat mengelola lebih dari satu usaha?",
      a: "Ya. Satu akun KOPERA dapat memiliki dan mengelola beberapa usaha secara terpisah dalam satu dasboard utama.",
    },
    {
      q: "Apakah KOPERA mendukung banyak lokasi?",
      a: "Ya. Setiap usaha dapat memiliki banyak lokasi cabang dengan pemantauan stok dan transaksi yang terisolasi secara rapi.",
    },
    {
      q: "Bagaimana pengguna/pegawai mengakses usaha?",
      a: "Pemilik usaha (Owner) dapat mengundang pegawai dan menentukan peran (misalnya Admin atau Kasir) dengan hak akses yang terkontrol.",
    },
    {
      q: "Apakah tersedia Online Store?",
      a: "Ya. KOPERA OS menyediakan modul Toko Online terpadu agar pelanggan dapat memesan produk secara instan via web.",
    },
    {
      q: "Bagaimana cara mulai menggunakan KOPERA?",
      a: "Cukup mendaftar akun gratis di website KOPERA OS, buat profil usaha Anda, dan Anda dapat langsung memulai operasional.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans" data-testid="faq-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-black tracking-tight text-blue-600" data-testid="faq-brand">
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
            <Link to="/harga" className="hover:text-blue-600 transition-colors">Harga</Link>
            <Link to="/faq" className="hover:text-blue-600 transition-colors active">FAQ</Link>
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
            <span>Pertanyaan Umum</span>
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 max-w-4xl mx-auto leading-tight"
            data-testid="faq-hero-title"
          >
            Pertanyaan yang Sering Diajukan
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto font-normal">
            Temukan jawaban atas pertanyaan populer mengenai penggunaan dan fitur KOPERA OS.
          </p>
        </div>
      </section>

      {/* FAQ Accordion List */}
      <section className="py-20 bg-gray-50/50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-3">{faq.q}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
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
          </div>
        </div>
      </footer>
    </div>
  );
}