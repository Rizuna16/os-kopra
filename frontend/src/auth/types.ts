export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiErrorBody {
  error: boolean;
  message: string;
  status_code: number;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  retryAfter?: string;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>,
    retryAfter?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.retryAfter = retryAfter;
  }
}
