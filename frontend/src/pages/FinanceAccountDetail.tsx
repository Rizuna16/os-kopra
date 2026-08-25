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

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Account</h1>
            <div data-testid="finance-account-detail-loading">Loading…</div>
          </div>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Account</h1>
            <div
              data-testid="finance-account-detail-error"
              className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4"
            >
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  if (!item)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Account</h1>
            <div data-testid="finance-account-detail" className="text-gray-500 text-sm">
              No account.
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div data-testid="finance-account-detail" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Account</h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</span>
              <span data-testid="finance-account-detail-id" className="text-sm text-gray-900">{item.id}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</span>
              <span data-testid="finance-account-detail-name" className="text-sm text-gray-900 font-medium">{item.name}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</span>
              <span data-testid="finance-account-detail-code" className="text-sm text-gray-900 font-medium">{item.code}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Business</span>
              <span data-testid="finance-account-detail-business" className="text-sm text-gray-900">{item.business}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Created At</span>
              <span data-testid="finance-account-detail-created-at" className="text-sm text-gray-900">{item.created_at}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Updated At</span>
              <span data-testid="finance-account-detail-updated-at" className="text-sm text-gray-900">{item.updated_at}</span>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Link
              to={`/finance/accounts/${item.id}/edit`}
              className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="py-3 px-4 bg-red-600 hover:bg-red-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
