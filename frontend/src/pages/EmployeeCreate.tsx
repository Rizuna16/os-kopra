import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { createEmployee } from "../employee/employeeService";
import type { EmployeePayload } from "../employee/types";
import { ApiError } from "../auth/types";

export function EmployeeCreate() {
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const nameRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const hireDateRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameRef.current?.value ?? "";
    if (!name.trim()) {
      setError("Name must not be empty or whitespace only.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const code = codeRef.current?.value ?? "";
      const hire_date = hireDateRef.current?.value ?? "";
      const active = activeRef.current ? activeRef.current.checked : true;

      const payload: EmployeePayload = {
        name,
        code: code.trim() ? code : null,
        hire_date: hire_date.trim() ? hire_date : null,
        active,
      };
      await createEmployee(currentBusinessId!, payload);
      navigate("/employees");
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors) {
        const first =
          e.errors.name?.[0] ??
          e.errors.non_field_errors?.[0] ??
          e.errors.code?.[0] ??
          e.errors.hire_date?.[0] ??
          e.errors.active?.[0];
        setError(first ?? e.message);
      } else {
        setError(e instanceof Error ? e.message : "Failed to create employee");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">New employee</h1>
          <form data-testid="employee-create-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                id="name"
                type="text"
                data-testid="employee-name-input"
                ref={nameRef}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                id="code"
                type="text"
                data-testid="employee-code-input"
                ref={codeRef}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label htmlFor="hire_date" className="block text-sm font-medium text-gray-700 mb-1">Hire date</label>
              <input
                id="hire_date"
                type="date"
                data-testid="employee-hire-date-input"
                ref={hireDateRef}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex items-center">
              <input
                id="active"
                type="checkbox"
                data-testid="employee-active-input"
                ref={activeRef}
                defaultChecked
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="active" className="ml-2 block text-sm text-gray-900 font-medium text-gray-700">Active</label>
            </div>
            {error && (
              <div data-testid="employee-create-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">
                {error}
              </div>
            )}
            <button
              type="submit"
              data-testid="employee-create-submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "…" : "Create employee"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
