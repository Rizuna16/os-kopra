import { useState, type FormEvent } from "react";
import { forgotPassword } from "../auth/authService";
import { ApiError } from "../auth/types";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      data-testid="forgot-password"
    >
      <div className="w-full max-w-md border rounded p-6">
        <h1 className="text-2xl font-bold">Forgot Password</h1>
        {message && <p>{message}</p>}
        {error && (
          <p role="alert" data-testid="forgot-error" className="text-red-600">
            {error}
          </p>
        )}
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="forgot-email"
            required
            className="border rounded px-2 py-1 w-full"
          />
          <button
            type="submit"
            disabled={loading}
            data-testid="forgot-submit"
            className="bg-blue-600 text-white rounded px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "…" : "Send reset link"}
          </button>
        </form>
        <p>
          <a href="/login" className="text-blue-600 hover:underline">
            Back to login
          </a>
        </p>
      </div>
    </div>
  );
}
