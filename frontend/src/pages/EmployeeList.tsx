import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { listEmployees } from "../employee/employeeService";
import type { Employee } from "../employee/types";
import { ApiError } from "../auth/types";

export function EmployeeList() {
  const { currentBusinessId } = useBusiness();
  const [items, setItems] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listEmployees(currentBusinessId)
      .then((data) => {
        if (cancelled) return;
        setItems(data);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof ApiError ? e.message : "Failed to load employees";
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <div data-testid="employee-list-loading" className="text-sm text-gray-500">Loading…</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <div data-testid="employee-list-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Employees</h1>
            <Link
              to="/employees/new"
              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              New employee
            </Link>
          </div>
          <div data-testid="employee-list">
            {items.length === 0 ? (
              <div data-testid="employee-list-empty" className="text-sm text-gray-500">No employees.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((emp) => (
                  <li key={emp.id} data-testid={`employee-item-${emp.id}`} className="py-3">
                    <Link
                      to={`/employees/${emp.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      {emp.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
