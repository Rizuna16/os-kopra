import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { createAccount } from "../finance/financeService";
import { ApiError } from "../auth/types";

export function FinanceAccountCreate() {
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const nameRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameRef.current?.value ?? "";
    if (!name.trim()) {
      setError("Name must not be empty or whitespace only.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createAccount(currentBusinessId!, {
        name,
        code: codeRef.current?.value ?? "",
      });
      navigate("/finance/accounts");
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors) {
        const first =
          e.errors.name?.[0] ?? e.errors.code?.[0] ?? e.errors.non_field_errors?.[0];
        setError(first ?? e.message);
      } else {
        setError(e instanceof Error ? e.message : "Failed to create account");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">New account</h1>
      <form data-testid="finance-account-create-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="name" className="block">Name</label>
          <input
            id="name"
            type="text"
            data-testid="finance-account-name-input"
            ref={nameRef}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label htmlFor="code" className="block">Code</label>
          <input
            id="code"
            type="text"
            data-testid="finance-account-code-input"
            ref={codeRef}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        {error && (
          <div data-testid="finance-account-create-error" className="text-red-600">{error}</div>
        )}
        <button
          type="submit"
          data-testid="finance-account-create-submit"
          disabled={submitting}
          className="bg-blue-600 text-white rounded px-3 py-1"
        >
          {submitting ? "…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
