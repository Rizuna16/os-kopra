export function Forbidden() {
  return (
    <div role="alert" data-testid="forbidden" className="text-red-600">
      <h1 className="text-2xl font-bold">403 — Forbidden</h1>
      <p>You do not have access to this page.</p>
    </div>
  );
}
