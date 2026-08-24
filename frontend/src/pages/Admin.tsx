import { useState, useEffect } from "react";
import { apiFetch } from "../lib/apiClient";
import { ApiError } from "../auth/types";
import { Forbidden } from "./Forbidden";

export function Admin() {
  const [state, setState] = useState<"loading" | "ok" | "forbidden">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await apiFetch("/admin/businesses/");
        if (active) setState("ok");
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          if (active) setState("forbidden");
        } else if (active) {
          setError(err instanceof Error ? err.message : "Request failed.");
          setState("ok");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") {
    return <div role="status">Loading…</div>;
  }

  if (state === "forbidden") {
    return <Forbidden />;
  }

  return (
    <div data-testid="admin" className="p-4">
      <h1 className="text-2xl font-bold">Admin KOPERA</h1>
      <p>Platform super-admin surface.</p>
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
