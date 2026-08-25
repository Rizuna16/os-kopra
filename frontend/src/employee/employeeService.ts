import { apiFetch } from "../lib/apiClient";
import type { Employee, EmployeePayload, EmployeeUpdatePayload } from "./types";

export type { Employee, EmployeePayload, EmployeeUpdatePayload };

export async function listEmployees(businessId: string): Promise<Employee[]> {
  return apiFetch<Employee[]>(`/businesses/${businessId}/employees/`);
}

export async function getEmployee(
  businessId: string,
  employeeId: string,
): Promise<Employee> {
  return apiFetch<Employee>(`/businesses/${businessId}/employees/${employeeId}/`);
}

export async function createEmployee(
  businessId: string,
  payload: EmployeePayload,
): Promise<Employee> {
  return apiFetch<Employee>(`/businesses/${businessId}/employees/`, {
    method: "POST",
    body: payload,
  });
}

export async function updateEmployee(
  businessId: string,
  employeeId: string,
  payload: EmployeeUpdatePayload,
): Promise<Employee> {
  return apiFetch<Employee>(`/businesses/${businessId}/employees/${employeeId}/`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteEmployee(
  businessId: string,
  employeeId: string,
): Promise<void> {
  await apiFetch<void>(`/businesses/${businessId}/employees/${employeeId}/`, {
    method: "DELETE",
  });
}
