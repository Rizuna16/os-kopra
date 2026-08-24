import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { deleteCustomer } from "../customer/customerService";
import { ApiError } from "../auth/types";

export function CustomerDelete() {
  const { customerId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!currentBusinessId || !customerId) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteCustomer(currentBusinessId, customerId);
      navigate("/customers");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete customer");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div data-testid="customer-delete" className="p-4 space-y-3">
      <button
        type="button"
        data-testid="customer-delete-submit"
        onClick={handleDelete}
        disabled={deleting}
        className="bg-red-600 text-white rounded px-3 py-1"
      >
        {deleting ? "…" : "Delete customer"}
      </button>
      {deleting && <span data-testid="customer-delete-deleting">Deleting…</span>}
      {error && <div data-testid="customer-delete-error" className="text-red-600">{error}</div>}
    </div>
  );
}
