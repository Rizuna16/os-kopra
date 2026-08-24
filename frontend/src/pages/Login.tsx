import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../auth/types";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      const to = (location.state as { from?: { pathname?: string } } | null)?.from
        ?.pathname;
      navigate(to ?? "/app", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      data-testid="login"
    >
      <div className="w-full max-w-md border rounded p-6">
        <h1 className="text-2xl font-bold">Login</h1>
        {error && (
          <p role="alert" data-testid="login-error" className="text-red-600">
            {error}
          </p>
        )}
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="email-input"
            required
            className="border rounded px-2 py-1 w-full"
          />
          <input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="password-input"
            required
            className="border rounded px-2 py-1 w-full"
          />
          <button
            type="submit"
            disabled={loading}
            data-testid="login-submit"
            className="bg-blue-600 text-white rounded px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "…" : "Login"}
          </button>
        </form>
        <p>
          <a href="/register" className="text-blue-600 hover:underline">
            Register
          </a>{" "}
          ·{" "}
          <a href="/forgot-password" className="text-blue-600 hover:underline">
            Forgot password?
          </a>
        </p>
      </div>
    </div>
  );
}
