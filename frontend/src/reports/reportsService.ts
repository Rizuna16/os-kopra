import { apiFetch } from "../lib/apiClient";
import type {
  OverviewReport,
  SalesReport,
  PurchasingReport,
  FinanceReport,
  InventoryReport,
  ReportFilter,
} from "./types";

function buildQuery(filter?: ReportFilter): string {
  if (!filter) return "";
  const { date_from, date_to } = filter;

  if (date_from && date_to && date_from > date_to) {
    throw new Error("Invalid date range");
  }

  const params: string[] = [];
  if (date_from) params.push(`date_from=${date_from}`);
  if (date_to) params.push(`date_to=${date_to}`);

  return params.length > 0 ? `?${params.join("&")}` : "";
}

export async function getOverviewReport(
  businessId: string,
  filter?: ReportFilter
): Promise<OverviewReport> {
  const query = buildQuery(filter);
  return apiFetch<OverviewReport>(`/businesses/${businessId}/reports/overview/${query}`);
}

export async function getSalesReport(
  businessId: string,
  filter?: ReportFilter
): Promise<SalesReport> {
  const query = buildQuery(filter);
  return apiFetch<SalesReport>(`/businesses/${businessId}/reports/sales/${query}`);
}

export async function getPurchasingReport(
  businessId: string,
  filter?: ReportFilter
): Promise<PurchasingReport> {
  const query = buildQuery(filter);
  return apiFetch<PurchasingReport>(`/businesses/${businessId}/reports/purchasing/${query}`);
}

export async function getFinanceReport(
  businessId: string,
  filter?: ReportFilter
): Promise<FinanceReport> {
  const query = buildQuery(filter);
  return apiFetch<FinanceReport>(`/businesses/${businessId}/reports/finance/${query}`);
}

export async function getInventoryReport(
  businessId: string
): Promise<InventoryReport> {
  return apiFetch<InventoryReport>(`/businesses/${businessId}/reports/inventory/`);
}
