import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getEmployee } from "../employee/employeeService";
import type { Employee } from "../employee/types";
import { ApiError } from "../auth/types";
import { EmployeeDelete } from "./EmployeeDelete";

export function EmployeeDetail() {
  const { employeeId } = useParams();
  const { currentBusinessId } = useBusiness();
  const [item, setItem] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId || !employeeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getEmployee(currentBusinessId, employeeId)
      .then((d) => {
        if (!cancelled) setItem(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load employee");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, employeeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">Employee details</h1>
            <div data-testid="employee-detail-loading" className="text-sm text-gray-500">Loading…</div>
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">Employee details</h1>
            <div data-testid="employee-detail-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <div data-testid="employee-detail" className="text-sm text-gray-500">No employee.</div>
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Employee details</h1>
            <Link
              to={`/employees/${item.id}/edit`}
              className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium text-sm rounded-xl transition-colors"
            >
              Edit employee
            </Link>
          </div>
          <div data-testid="employee-detail" className="space-y-3 text-sm text-gray-700">
            <div>
              <span className="font-medium text-gray-500">ID:</span>{" "}
              <span data-testid="employee-detail-id" className="font-mono text-gray-900">{item.id}</span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Name:</span>{" "}
              <span data-testid="employee-detail-name" className="text-gray-900">{item.name}</span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Code:</span>{" "}
              <span data-testid="employee-detail-code" className="text-gray-900">{item.code ?? "-"}</span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Hire date:</span>{" "}
              <span data-testid="employee-detail-hire-date" className="text-gray-900">{item.hire_date ?? "-"}</span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Active:</span>{" "}
              <span data-testid="employee-detail-active" className="text-gray-900">{String(item.active)}</span>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <EmployeeDelete />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
