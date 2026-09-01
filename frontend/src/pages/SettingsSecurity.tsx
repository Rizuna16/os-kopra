import { useState } from "react";
import { changePassword } from "../auth/authService";
import { ApiError } from "../auth/types";

export function SettingsSecurity() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      setSuccess("Password berhasil diubah.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Gagal mengubah password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-testid="settings-security-page" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Keamanan Akun</h2>
        <p className="text-sm text-gray-500 mt-1">Ubah password akun owner Anda secara berkala untuk keamanan maksimal.</p>
      </div>

      {error && (
        <div data-testid="settings-security-error" className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {success && (
        <div data-testid="settings-security-success" className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-200">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password Saat Ini</label>
          <input
            type="password"
            data-testid="current-password-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password Baru</label>
          <input
            type="password"
            data-testid="new-password-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Konfirmasi Password Baru</label>
          <input
            type="password"
            data-testid="confirm-password-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          data-testid="save-security-settings-btn"
          disabled={loading}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Ubah Password"}
        </button>
      </form>
    </div>
  );
}
