import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Landing() {
  const { status } = useAuth();

  if (status === "loading") {
    return <div role="status">Loading…</div>;
  }

  return <Navigate to={status === "authenticated" ? "/app" : "/login"} replace />;
}
