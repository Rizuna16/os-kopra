import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { deleteCustomerLoyaltyRecord } from "../promotion_loyalty/promotionLoyaltyService";
import { ApiError } from "../auth/types";

export function CustomerLoyaltyRecordDelete() {
  const { programId, recordId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!currentBusinessId || !programId || !recordId) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteCustomerLoyaltyRecord(currentBusinessId, programId, recordId);
      navigate(`/loyalty-programs/${programId}/customers`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete loyalty record");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div data-testid="customer-loyalty-record-delete" className="p-4 space-y-3">
      <button
        type="button"
        data-testid="customer-loyalty-record-delete-submit"
        onClick={handleDelete}
        disabled={deleting}
        className="bg-red-600 text-white rounded px-3 py-1"
      >
        {deleting ? "…" : "Delete record"}
      </button>
      {deleting && <span data-testid="customer-loyalty-record-delete-deleting">Deleting…</span>}
      {error && <div data-testid="customer-loyalty-record-delete-error" className="text-red-600">{error}</div>}
    </div>
  );
}