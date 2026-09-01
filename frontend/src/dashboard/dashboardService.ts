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
    estimasiLaba?: string;
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
      totalOmzet: overview?.sales?.revenue || "0.00",
      totalPenjualan: overview?.sales?.completed || 0,
      totalPengeluaran: overview?.finance?.expense_total || "0.00",
      totalProduk: overview?.counts?.products || 0,
      estimasiLaba: overview?.finance?.net_profit || "0.00",
    },
    overview,
    notifications,
    onlineStores,
  };
}
