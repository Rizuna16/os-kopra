import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { fetchAccount, updateAccount } from "../finance/financeService";
import type { Account } from "../finance/types";
import { ApiError } from "../auth/types";

export function FinanceAccountEdit() {
  const { accountId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [item, setItem] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentBusinessId || !accountId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAccount(currentBusinessId, accountId)
      .then((d) => {
        if (!cancelled) setItem(d);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : "Failed to load account");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId || !accountId) return;
    const name = nameRef.current?.value ?? "";
    if (!name.trim()) {
      setError("Name must not be empty or whitespace only.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await updateAccount(currentBusinessId, accountId, {
        name,
        code: codeRef.current?.value ?? "",
      }, true);
      navigate(`/finance/accounts/${accountId}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors) {
        const first =
          e.errors.name?.[0] ?? e.errors.code?.[0] ?? e.errors.non_field_errors?.[0];
        setError(first ?? e.message);
      } else {
        setError(e instanceof Error ? e.message : "Failed to update account");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div data-testid="finance-account-edit-loading">Loading…</div>;
  if (error) return <div data-testid="finance-account-edit-error">{error}</div>;
  if (!item) return <div data-testid="finance-account-edit">Account not found.</div>;
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Edit account</h1>
      <form data-testid="finance-account-edit-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="name" className="block">Name</label>
          <input
            id="name"
            type="text"
            data-testid="finance-account-name-input"
            ref={nameRef}
            defaultValue={item.name}
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
            defaultValue={item.code}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        {error && (
          <div data-testid="finance-account-edit-error" className="text-red-600">{error}</div>
        )}
        <button
          type="submit"
          data-testid="finance-account-edit-submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded px-3 py-1"
        >
          {loading ? "…" : "Update account"}
        </button>
      </form>
    </div>
  );
}
