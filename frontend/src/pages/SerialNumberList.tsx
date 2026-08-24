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

  if (loading) return <div data-testid="serial-list-loading">Loading…</div>;
  if (error) return <div data-testid="serial-list-error">{error}</div>;
  return (
    <div data-testid="serial-list">
      <form data-testid="serial-create-form" onSubmit={handleCreate}>
        <input
          type="text"
          data-testid="serial-batch-input"
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
        />
        <input
          type="text"
          data-testid="serial-number-input"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
        />
        <button
          type="submit"
          data-testid="serial-create-submit"
          disabled={submitting}
        >
          {submitting ? "…" : "Add serial"}
        </button>
        {createError && <div data-testid="serial-create-error">{createError}</div>}
      </form>
      {items.length === 0 ? (
        <div data-testid="serial-list-empty">No serial numbers.</div>
      ) : (
        <ul>
          {items.map((s) => (
            <li key={s.id} data-testid={`serial-item-${s.id}`}>
              <span data-testid="serial-number-value">{s.serial_number}</span>
              <button
                type="button"
                data-testid={`serial-delete-${s.id}`}
                onClick={() => handleDelete(s.id)}
              >
                Delete
              </button>
              <button
                type="button"
                data-testid={`serial-edit-${s.id}`}
                onClick={() => handleUpdate(s.id, s.serial_number)}
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}