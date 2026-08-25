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
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div data-testid="supplier-delete" className="space-y-3">
            <button
              type="button"
              data-testid="supplier-delete-submit"
              onClick={handleDelete}
              disabled={deleting}
              className="py-3 px-4 bg-red-600 hover:bg-red-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? "…" : "Delete supplier"}
            </button>
            {deleting && <span data-testid="supplier-delete-deleting" className="text-sm text-gray-500 block">Deleting…</span>}
            {error && (
              <div data-testid="supplier-delete-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
