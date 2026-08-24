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

  if (loading) return <div data-testid="loyalty-program-edit-loading">Loading…</div>;
  if (error) return <div data-testid="loyalty-program-edit-error">{error}</div>;
  if (!item) return <div data-testid="loyalty-program-edit">Loyalty program not found.</div>;
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Edit loyalty program</h1>
      <form data-testid="loyalty-program-edit-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="name" className="block">Name</label>
          <input
            id="name"
            type="text"
            data-testid="loyalty-program-name-input"
            ref={nameRef}
            defaultValue={item.name}
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
        {error && <div data-testid="loyalty-program-edit-error" className="text-red-600">{error}</div>}
        <button
          type="submit"
          data-testid="loyalty-program-edit-submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded px-3 py-1"
        >
          {loading ? "…" : "Update loyalty program"}
        </button>
      </form>
    </div>
  );
}