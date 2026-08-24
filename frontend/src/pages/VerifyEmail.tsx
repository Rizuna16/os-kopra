import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { verifyEmail } from "../auth/authService";
import { ApiError } from "../auth/types";

export function VerifyEmail() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState<string>("Verifying your email…");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setMessage("Missing verification token.");
      setDone(true);
      return;
    }
    verifyEmail(token)
      .then(() => setMessage("Email verified successfully. You can now log in."))
      .catch((err) =>
        setMessage(
          err instanceof ApiError
            ? err.message
            : "Verification failed. The link may be invalid or expired.",
        ),
      )
      .finally(() => setDone(true));
  }, [params]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      data-testid="verify-email"
    >
      <div className="w-full max-w-md border rounded p-6">
        <h1 className="text-2xl font-bold">Email Verification</h1>
        <p aria-busy={!done}>{message}</p>
        {done && (
          <p>
            <a href="/login" className="text-blue-600 hover:underline">
              Go to login
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
