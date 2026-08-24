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
      className="min-h-screen flex items-center justify-center p-4"
      data-testid="reset-password"
    >
      <div className="w-full max-w-md border rounded p-6">
        <h1 className="text-2xl font-bold">Reset Password</h1>
        {message && <p>{message}</p>}
        {error && (
          <p role="alert" data-testid="reset-error" className="text-red-600">
            {error}
          </p>
        )}
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="password"
            placeholder="New password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="new-password"
            required
            className="border rounded px-2 py-1 w-full"
          />
          <input
            type="password"
            placeholder="Confirm password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            data-testid="confirm-password"
            required
            className="border rounded px-2 py-1 w-full"
          />
          <button
            type="submit"
            disabled={loading}
            data-testid="reset-submit"
            className="bg-blue-600 text-white rounded px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "…" : "Reset password"}
          </button>
        </form>
      </div>
    </div>
  );
}
