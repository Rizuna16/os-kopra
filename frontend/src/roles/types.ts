export interface Member {
  id: string;
  business: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  role: "ADMIN" | "KASIR";
  created_at: string;
  updated_at: string;
}

export interface MemberCreateInput {
  user_id: string;
  role: "ADMIN" | "KASIR";
}

export interface MemberUpdateInput {
  role: "ADMIN" | "KASIR";
}

export type PermissionDomain =
  | "products"
  | "variants"
  | "inventory"
  | "sales"
  | "purchasing"
  | "customers"
  | "suppliers"
  | "finance"
  | "reports"
  | "notifications"
  | "stores"
  | "employees"
  | "roles";

export interface RolePermissionMatrix {
  role: "ADMIN" | "KASIR";
  permissions: Record<PermissionDomain, "full" | "read" | "none">;
}