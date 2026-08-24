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
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">New loyalty program</h1>
      <form data-testid="loyalty-program-create-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="name" className="block">Name</label>
          <input
            id="name"
            type="text"
            data-testid="loyalty-program-name-input"
            ref={nameRef}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label htmlFor="status" className="block">Status</label>
          <select
            id="status"
            data-testid="loyalty-program-status-input"
            value={status}
            onChange={(e) => setStatus(e.target.value as LoyaltyProgramStatus)}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
        {error && <div data-testid="loyalty-program-create-error" className="text-red-600">{error}</div>}
        <button
          type="submit"
          data-testid="loyalty-program-create-submit"
          disabled={submitting}
          className="bg-blue-600 text-white rounded px-3 py-1"
        >
          {submitting ? "…" : "Create loyalty program"}
        </button>
      </form>
    </div>
  );
}