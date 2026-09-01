export interface OverviewReport {
  sales: {
    total: number;
    completed: number;
    voided: number;
    draft: number;
    revenue: string;
    cogs?: string;
    gross_profit?: string;
    loyalty_earned: string;
  };
  purchasing: {
    total: number;
    confirmed: number;
    cancelled: number;
    draft: number;
    cost: string;
  };
  finance: {
    expense_total: string;
    net_profit?: string;
    journal: {
      DRAFT: number;
      POSTED: number;
      REVERSED: number;
    };
    journal_entry: {
      DEBIT: string;
      CREDIT: string;
    };
  };
  counts: {
    customers: number;
    products: number;
    variants: number;
    employees: number;
    employees_active: number;
  };
}

export interface SalesReport {
  total: number;
  completed: number;
  voided: number;
  draft: number;
  revenue: string;
  cogs?: string;
  gross_profit?: string;
  loyalty_earned: string;
}

export interface PurchasingReport {
  total: number;
  confirmed: number;
  cancelled: number;
  draft: number;
  cost: string;
}

export interface FinanceReport {
  expense_total: string;
  net_profit?: string;
  journal: {
    DRAFT: number;
    POSTED: number;
    REVERSED: number;
  };
  journal_entry: {
    DEBIT: string;
    CREDIT: string;
  };
}

export interface InventoryReport {
  total_products: number;
  total_variants: number;
  total_stock_quantity: number;
  low_stock_count: number;
  inventory_value: string;
}

export interface ReportFilter {
  date_from?: string;
  date_to?: string;
}
