import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getLoyaltyProgram, updateLoyaltyProgram } from "../promotion_loyalty/promotionLoyaltyService";
import type { LoyaltyProgram, LoyaltyProgramUpdatePayload, LoyaltyProgramStatus } from "../promotion_loyalty/types";
import { ApiError } from "../auth/types";

export function LoyaltyProgramEdit() {
  const { programId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [item, setItem] = useState<LoyaltyProgram | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<LoyaltyProgramStatus>("ACTIVE");

  useEffect(() => {
    if (!currentBusinessId || !programId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getLoyaltyProgram(currentBusinessId, programId)
      .then((d) => {
        if (!cancelled) {
          setItem(d);
          setStatus(d.status);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load loyalty program");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, programId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId || !programId) return;
    const name = nameRef.current?.value ?? "";
    if (!name.trim()) {
      setError("Name must not be empty or whitespace only.");
      return;
    }
    setError(null);
    setLoading(true);
    const payload: LoyaltyProgramUpdatePayload = {
      name,
      status,
    };
    try {
      await updateLoyaltyProgram(currentBusinessId, programId, payload);
      navigate(`/loyalty-programs/${programId}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors) {
        const first = e.errors.name?.[0] ?? e.message;
        setError(first ?? e.message);
      } else {
        setError(e instanceof Error ? e.message : "Failed to update loyalty program");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && !item)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit loyalty program</h1>
            <div data-testid="loyalty-program-edit-loading">Loading…</div>
          </div>
        </div>
      </div>
    );
  if (error && !item)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit loyalty program</h1>
            <div
              data-testid="loyalty-program-edit-error"
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit loyalty program</h1>
            <div data-testid="loyalty-program-edit" className="text-gray-500 text-sm">
              Loyalty program not found.
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <div className="min-h-screen bg-gray-50" data-testid="loyalty-program-edit">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit loyalty program</h1>
          <form data-testid="loyalty-program-edit-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-700 block mb-1">Name</label>
              <input
                id="name"
                type="text"
                data-testid="loyalty-program-name-input"
                ref={nameRef}
                defaultValue={item.name}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label htmlFor="status" className="text-sm font-medium text-gray-700 block mb-1">Status</label>
              <select
                id="status"
                data-testid="loyalty-program-status-input"
                value={status}
                onChange={(e) => setStatus(e.target.value as LoyaltyProgramStatus)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            {error && (
              <div
                data-testid="loyalty-program-edit-error"
                className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4"
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              data-testid="loyalty-program-edit-submit"
              disabled={loading}
              className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "…" : "Update loyalty program"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}