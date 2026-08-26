import { getOverviewReport } from "../reports/reportsService";
import { listNotifications } from "../notifications/notificationService";
import { listOnlineStores } from "../onlinestore/onlineStoreService";
import type { OverviewReport } from "../reports/types";
import type { Notification } from "../notifications/types";
import type { OnlineStoreDetail } from "../onlinestore/types";

export interface DashboardData {
  executive: {
    totalOmzet: string;
    totalPenjualan: number;
    totalPengeluaran: string;
    totalProduk: number;
  };
  overview: OverviewReport;
  notifications: Notification[];
  onlineStores: OnlineStoreDetail[];
}

export async function getOwnerDashboard(businessId: string): Promise<DashboardData> {
  const [overview, notifications, onlineStores] = await Promise.all([
    getOverviewReport(businessId),
    listNotifications(businessId),
    listOnlineStores(businessId),
  ]);

  return {
    executive: {
      totalOmzet: overview.sales.revenue,
      totalPenjualan: overview.sales.completed,
      totalPengeluaran: overview.finance.expense_total,
      totalProduk: overview.counts.products,
    },
    overview,
    notifications,
    onlineStores,
  };
}
