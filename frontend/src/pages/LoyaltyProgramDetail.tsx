import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getLoyaltyProgram } from "../promotion_loyalty/promotionLoyaltyService";
import type { LoyaltyProgram } from "../promotion_loyalty/types";
import { ApiError } from "../auth/types";
import { LoyaltyProgramDelete } from "./LoyaltyProgramDelete";

export function LoyaltyProgramDetail() {
  const { programId } = useParams();
  const { currentBusinessId } = useBusiness();
  const [item, setItem] = useState<LoyaltyProgram | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId || !programId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getLoyaltyProgram(currentBusinessId, programId)
      .then((d) => {
        if (!cancelled) setItem(d);
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

  if (loading) return <div data-testid="loyalty-program-detail-loading">Loading…</div>;
  if (error) return <div data-testid="loyalty-program-detail-error">{error}</div>;
  if (!item) return <div data-testid="loyalty-program-detail">No loyalty program.</div>;
  return (
    <div data-testid="loyalty-program-detail" className="p-4 space-y-2">
      <h1 className="text-2xl font-bold">Loyalty Program</h1>
      <p data-testid="loyalty-program-detail-id">{item.id}</p>
      <p data-testid="loyalty-program-detail-business">{item.business}</p>
      <p data-testid="loyalty-program-detail-name">{item.name}</p>
      <p data-testid="loyalty-program-detail-status">{item.status}</p>
      <p data-testid="loyalty-program-detail-created-at">{item.created_at}</p>
      <p data-testid="loyalty-program-detail-updated-at">{item.updated_at}</p>
      <LoyaltyProgramDelete />
    </div>
  );
}