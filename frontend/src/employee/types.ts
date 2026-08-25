export interface Employee {
  id: string;
  business: string;
  name: string;
  code: string | null;
  hire_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeePayload {
  name: string;
  code?: string | null;
  hire_date?: string | null;
  active?: boolean;
}

export interface EmployeeUpdatePayload {
  name?: string;
  code?: string | null;
  hire_date?: string | null;
  active?: boolean;
}
