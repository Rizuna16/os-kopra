import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { deleteSupplier } from "../supplier/supplierService";
import { ApiError } from "../auth/types";

export function SupplierDelete() {
  const { supplierId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!currentBusinessId || !supplierId) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteSupplier(currentBusinessId, supplierId);
      navigate("/suppliers");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete supplier");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div data-testid="supplier-delete" className="p-4 space-y-3">
      <button
        type="button"
        data-testid="supplier-delete-submit"
        onClick={handleDelete}
        disabled={deleting}
        className="bg-red-600 text-white rounded px-3 py-1"
      >
        {deleting ? "…" : "Delete supplier"}
      </button>
      {deleting && <span data-testid="supplier-delete-deleting">Deleting…</span>}
      {error && <div data-testid="supplier-delete-error" className="text-red-600">{error}</div>}
    </div>
  );
}
