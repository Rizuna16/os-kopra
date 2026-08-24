import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { fetchAccount, deleteAccount } from "../finance/financeService";
import type { Account } from "../finance/types";
import { ApiError } from "../auth/types";

export function FinanceAccountDetail() {
  const { accountId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [item, setItem] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleDelete = async () => {
    if (!currentBusinessId || !accountId) return;
    if (!confirm("Delete this account?")) return;
    setLoading(true);
    setError(null);
    try {
      await deleteAccount(currentBusinessId, accountId);
      navigate("/finance/accounts");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div data-testid="finance-account-detail-loading">Loading…</div>;
  if (error) return <div data-testid="finance-account-detail-error">{error}</div>;
  if (!item) return <div data-testid="finance-account-detail">No account.</div>;
  return (
    <div data-testid="finance-account-detail" className="p-4 space-y-2">
      <h1 className="text-2xl font-bold">Account</h1>
      <p data-testid="finance-account-detail-id">{item.id}</p>
      <p data-testid="finance-account-detail-name">{item.name}</p>
      <p data-testid="finance-account-detail-code">{item.code}</p>
      <p data-testid="finance-account-detail-business">{item.business}</p>
      <p data-testid="finance-account-detail-created-at">{item.created_at}</p>
      <p data-testid="finance-account-detail-updated-at">{item.updated_at}</p>
      <div className="flex gap-2">
        <Link to={`/finance/accounts/${item.id}/edit`} className="bg-blue-600 text-white rounded px-3 py-1">
          Edit
        </Link>
        <button onClick={handleDelete} className="bg-red-600 text-white rounded px-3 py-1">
          Delete
        </button>
      </div>
    </div>
  );
}
