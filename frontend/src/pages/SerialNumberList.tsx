import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listSerials,
  createSerial,
  deleteSerial,
  updateSerial,
} from "../inventory/inventoryService";
import type { SerialNumber } from "../inventory/types";
import { ApiError } from "../auth/types";

export function SerialNumberList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SerialNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [batch, setBatch] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    listSerials()
      .then(setItems)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setError(e instanceof ApiError ? e.message : "Failed to load serial numbers");
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [navigate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setSubmitting(true);
    try {
      await createSerial({ batch, serial_number: serialNumber });
      setBatch("");
      setSerialNumber("");
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setCreateError(
        err instanceof ApiError && err.errors?.serial_number
          ? err.errors.serial_number[0]
          : err instanceof Error
            ? err.message
            : "Failed to create serial number",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSerial(id);
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(err instanceof ApiError ? err.message : "Failed to delete serial number");
    }
  };

  const handleUpdate = async (id: string, value: string) => {
    try {
      await updateSerial(id, { serial_number: value });
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(err instanceof ApiError ? err.message : "Failed to update serial number");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500 py-8 text-center" data-testid="serial-list-loading">
          Loading…
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div
            className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4"
            data-testid="serial-list-error"
          >
            {error}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div data-testid="serial-list" className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Serial Numbers</h1>
          <form data-testid="serial-create-form" onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="serial-batch" className="text-sm font-medium text-gray-700 block mb-1">
                Batch
              </label>
              <input
                id="serial-batch"
                type="text"
                data-testid="serial-batch-input"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label htmlFor="serial-number" className="text-sm font-medium text-gray-700 block mb-1">
                Serial number
              </label>
              <input
                id="serial-number"
                type="text"
                data-testid="serial-number-input"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
            <button
              type="submit"
              data-testid="serial-create-submit"
              disabled={submitting}
              className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "…" : "Add serial"}
            </button>
            {createError && (
              <div
                data-testid="serial-create-error"
                className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4"
              >
                {createError}
              </div>
            )}
          </form>
          {items.length === 0 ? (
            <div data-testid="serial-list-empty" className="text-center py-12 text-gray-500 text-sm">
              No serial numbers.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((s) => (
                <li
                  key={s.id}
                  data-testid={`serial-item-${s.id}`}
                  className="py-3 flex items-center justify-between"
                >
                  <span data-testid="serial-number-value" className="text-sm text-gray-900">
                    {s.serial_number}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid={`serial-edit-${s.id}`}
                      onClick={() => handleUpdate(s.id, s.serial_number)}
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      data-testid={`serial-delete-${s.id}`}
                      onClick={() => handleDelete(s.id)}
                      className="bg-red-600 hover:bg-red-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}