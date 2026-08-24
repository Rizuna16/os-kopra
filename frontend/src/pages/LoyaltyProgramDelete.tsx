import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { deleteLoyaltyProgram } from "../promotion_loyalty/promotionLoyaltyService";
import { ApiError } from "../auth/types";

export function LoyaltyProgramDelete() {
  const { programId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!currentBusinessId || !programId) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteLoyaltyProgram(currentBusinessId, programId);
      navigate("/loyalty-programs");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete loyalty program");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div data-testid="loyalty-program-delete" className="p-4 space-y-3">
      <button
        type="button"
        data-testid="loyalty-program-delete-submit"
        onClick={handleDelete}
        disabled={deleting}
        className="bg-red-600 text-white rounded px-3 py-1"
      >
        {deleting ? "…" : "Delete loyalty program"}
      </button>
      {deleting && <span data-testid="loyalty-program-delete-deleting">Deleting…</span>}
      {error && <div data-testid="loyalty-program-delete-error" className="text-red-600">{error}</div>}
    </div>
  );
}