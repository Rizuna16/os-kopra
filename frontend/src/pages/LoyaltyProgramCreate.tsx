import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { createLoyaltyProgram } from "../promotion_loyalty/promotionLoyaltyService";
import type { LoyaltyProgramPayload, LoyaltyProgramStatus } from "../promotion_loyalty/types";
import { ApiError } from "../auth/types";

export function LoyaltyProgramCreate() {
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const nameRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<LoyaltyProgramStatus>("ACTIVE");
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
    const payload: LoyaltyProgramPayload = {
      name,
      status,
    };
    try {
      await createLoyaltyProgram(currentBusinessId!, payload);
      navigate("/loyalty-programs");
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors) {
        const first = e.errors.name?.[0] ?? e.message;
        setError(first ?? e.message);
      } else {
        setError(e instanceof Error ? e.message : "Failed to create loyalty program");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="loyalty-program-create">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">New loyalty program</h1>
          <form data-testid="loyalty-program-create-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-700 block mb-1">Name</label>
              <input
                id="name"
                type="text"
                data-testid="loyalty-program-name-input"
                ref={nameRef}
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
                data-testid="loyalty-program-create-error"
                className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4"
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              data-testid="loyalty-program-create-submit"
              disabled={submitting}
              className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "…" : "Create loyalty program"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}