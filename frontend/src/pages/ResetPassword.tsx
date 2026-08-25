import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { resetPassword } from "../auth/authService";
import { ApiError } from "../auth/types";

export function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    const token = params.get("token");
    if (!token) {
      setError("Missing reset token.");
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(token, password, confirm);
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
      data-testid="reset-password"
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reset Password</h1>
        {message && <p className="text-sm text-gray-600">{message}</p>}
        {error && (
          <p role="alert" data-testid="reset-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">
            {error}
          </p>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="text-sm font-medium text-gray-700 block mb-1">New password</label>
            <input
              id="new-password"
              type="password"
              placeholder="New password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="new-password"
              required
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="text-sm font-medium text-gray-700 block mb-1">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Confirm password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              data-testid="confirm-password"
              required
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            data-testid="reset-submit"
            className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed w-full"
          >
            {loading ? "…" : "Reset password"}
          </button>
        </form>
      </div>
    </div>
  );
}
