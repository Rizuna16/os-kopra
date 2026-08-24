import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../auth/types";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await register({ email, password, password_confirm: confirm });
      navigate("/login", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      data-testid="register"
    >
      <div className="w-full max-w-md border rounded p-6">
        <h1 className="text-2xl font-bold">Register</h1>
        {error && (
          <p role="alert" data-testid="register-error" className="text-red-600">
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
            data-testid="reg-email"
            required
            className="border rounded px-2 py-1 w-full"
          />
          <input
            type="password"
            placeholder="Password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="reg-password"
            required
            className="border rounded px-2 py-1 w-full"
          />
          <input
            type="password"
            placeholder="Confirm password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            data-testid="reg-confirm"
            required
            className="border rounded px-2 py-1 w-full"
          />
          <button
            type="submit"
            disabled={loading}
            data-testid="register-submit"
            className="bg-blue-600 text-white rounded px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "…" : "Register"}
          </button>
        </form>
        <p>
          <a href="/login" className="text-blue-600 hover:underline">
            Already have an account? Login
          </a>
        </p>
      </div>
    </div>
  );
}
