import type { ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";
import { AdminRoute } from "./AdminRoute";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { Landing } from "../pages/Landing";
import { Tentang } from "../pages/Tentang";
import { Fitur } from "../pages/Fitur";
import { Harga } from "../pages/Harga";
import { FAQ } from "../pages/FAQ";
import { Kontak } from "../pages/Kontak";
import { Terms } from "../pages/Terms";
import { Privacy } from "../pages/Privacy";
import { Login } from "../pages/Login";
import { Register } from "../pages/Register";
import { VerifyEmail } from "../pages/VerifyEmail";
import { ForgotPassword } from "../pages/ForgotPassword";
import { ResetPassword } from "../pages/ResetPassword";
import { Onboarding } from "../pages/Onboarding";
import { AppLayout } from "../layouts/AppLayout";
import { AppHome } from "../pages/AppHome";
import { OwnerDashboard } from "../pages/OwnerDashboard";
import { RolePermissionList } from "../pages/RolePermissionList";
import { KasirDashboard } from "../pages/KasirDashboard";
import { Admin } from "../pages/Admin";
import { Storefront } from "../pages/Storefront";
import { Forbidden } from "../pages/Forbidden";
import { NotFound } from "../pages/NotFound";
import { ProductList } from "../pages/ProductList";
import { ProductCreate } from "../pages/ProductCreate";
import { ProductDetail } from "../pages/ProductDetail";
import { ProductEdit } from "../pages/ProductEdit";
import { ProductDelete } from "../pages/ProductDelete";
import { SupplierList } from "../pages/SupplierList";
import { SupplierCreate } from "../pages/SupplierCreate";
import { SupplierDetail } from "../pages/SupplierDetail";
import { SupplierEdit } from "../pages/SupplierEdit";
import { EmployeeList } from "../pages/EmployeeList";
import { EmployeeCreate } from "../pages/EmployeeCreate";
import { EmployeeDetail } from "../pages/EmployeeDetail";
import { EmployeeEdit } from "../pages/EmployeeEdit";
import { VariantList } from "../pages/VariantList";
import { VariantCreate } from "../pages/VariantCreate";
import { VariantDetail } from "../pages/VariantDetail";
import { VariantEdit } from "../pages/VariantEdit";
import { VariantDelete } from "../pages/VariantDelete";
import { PurchaseOrderList } from "../pages/PurchaseOrderList";
import { PurchaseOrderCreate } from "../pages/PurchaseOrderCreate";
import { PurchaseOrderDetail } from "../pages/PurchaseOrderDetail";
import { PurchaseOrderEdit } from "../pages/PurchaseOrderEdit";
import { SaleList } from "../pages/SaleList";
import { SaleCreate } from "../pages/SaleCreate";
import { SaleDetail } from "../pages/SaleDetail";
import { SaleEdit } from "../pages/SaleEdit";
import { CustomerList } from "../pages/CustomerList";
import { CustomerCreate } from "../pages/CustomerCreate";
import { CustomerDetail } from "../pages/CustomerDetail";
import { CustomerEdit } from "../pages/CustomerEdit";
import { PromotionList } from "../pages/PromotionList";
import { PromotionCreate } from "../pages/PromotionCreate";
import { PromotionDetail } from "../pages/PromotionDetail";
import { PromotionEdit } from "../pages/PromotionEdit";
import { PromotionDelete } from "../pages/PromotionDelete";
import { LoyaltyProgramList } from "../pages/LoyaltyProgramList";
import { LoyaltyProgramCreate } from "../pages/LoyaltyProgramCreate";
import { LoyaltyProgramDetail } from "../pages/LoyaltyProgramDetail";
import { LoyaltyProgramEdit } from "../pages/LoyaltyProgramEdit";
import { LoyaltyProgramDelete } from "../pages/LoyaltyProgramDelete";
import { CustomerLoyaltyRecordList } from "../pages/CustomerLoyaltyRecordList";
import { CustomerLoyaltyRecordCreate } from "../pages/CustomerLoyaltyRecordCreate";
import { CustomerLoyaltyRecordDetail } from "../pages/CustomerLoyaltyRecordDetail";
import { CustomerLoyaltyRecordEdit } from "../pages/CustomerLoyaltyRecordEdit";
import { CustomerLoyaltyRecordDelete } from "../pages/CustomerLoyaltyRecordDelete";
import { FinanceAccountList } from "../pages/FinanceAccountList";
import { FinanceAccountCreate } from "../pages/FinanceAccountCreate";
import { FinanceAccountDetail } from "../pages/FinanceAccountDetail";
import { FinanceAccountEdit } from "../pages/FinanceAccountEdit";
import { FinanceJournalList } from "../pages/FinanceJournalList";
import { FinanceExpenseList } from "../pages/FinanceExpenseList";
import { ReportsOverview } from "../pages/ReportsOverview";
import { ReportsSales } from "../pages/ReportsSales";
import { ReportsPurchasing } from "../pages/ReportsPurchasing";
import { ReportsFinance } from "../pages/ReportsFinance";
import { ReportsCashflow } from "../pages/ReportsCashflow";
import { ReportsInventory } from "../pages/ReportsInventory";
import { Notifications } from "../pages/Notifications";
import { NotificationDetail } from "../pages/NotificationDetail";
import { Billing } from "../pages/Billing";
import { Settings } from "../pages/Settings";
import { SettingsBusiness } from "../pages/SettingsBusiness";
import { OnlineStoreList } from "../pages/OnlineStoreList";
import { OnlineStoreCreate } from "../pages/OnlineStoreCreate";
import { OnlineStoreProductList } from "../pages/OnlineStoreProductList";
import { OnlineStoreOrders } from "../pages/OnlineStoreOrders";
import { StorefrontCart } from "../pages/StorefrontCart";
import { StorefrontCheckout } from "../pages/StorefrontCheckout";
import { ReceivableList } from "../pages/ReceivableList";
import { CreditSaleCreate } from "../pages/CreditSaleCreate";
import { ReceivableDetail } from "../pages/ReceivableDetail";
import { PiutangReports } from "../pages/PiutangReports";
import { PayableList } from "../pages/PayableList";
import { PayableCreate } from "../pages/PayableCreate";
import { PayableDetail } from "../pages/PayableDetail";
import { UtangReports } from "../pages/UtangReports";

import { PlatformLayout } from "../components/PlatformLayout";
import { SuperAdminDashboard } from "../pages/SuperAdminDashboard";
import { SuperAdminBusinesses } from "../pages/SuperAdminBusinesses";
import { SuperAdminBusinessDetail } from "../pages/SuperAdminBusinessDetail";
import { SuperAdminAccounts } from "../pages/SuperAdminAccounts";
import { SuperAdminAccountDetail } from "../pages/SuperAdminAccountDetail";
import { SuperAdminOwners } from "../pages/SuperAdminOwners";
import { SuperAdminOwnerDetail } from "../pages/SuperAdminOwnerDetail";
import { SuperAdminUsers } from "../pages/SuperAdminUsers";
import { SuperAdminUserDetail } from "../pages/SuperAdminUserDetail";
import { SuperAdminAdmins } from "../pages/SuperAdminAdmins";
import { SuperAdminAdminDetail } from "../pages/SuperAdminAdminDetail";
import { SuperAdminAuditLogs } from "../pages/SuperAdminAuditLogs";
import { SuperAdminBackups } from "../pages/SuperAdminBackups";
import { SuperAdminSubscriptions } from "../pages/SuperAdminSubscriptions";
import { SuperAdminSubscriptionDetail } from "../pages/SuperAdminSubscriptionDetail";
import { SuperAdminPlans } from "../pages/SuperAdminPlans";
import { SuperAdminPlanDetail } from "../pages/SuperAdminPlanDetail";
import { SuperAdminPayments } from "../pages/SuperAdminPayments";
import { SuperAdminModules } from "../pages/SuperAdminModules";
import { SuperAdminFeatures } from "../pages/SuperAdminFeatures";
import { SuperAdminSupportCenter } from "../pages/SuperAdminSupportCenter";
import { SuperAdminSupportTicketDetail } from "../pages/SuperAdminSupportTicketDetail";

function BusinessRoute({ children }: { children: ReactNode }) {
  const { currentBusinessId, currentBusiness } = useBusiness();
  const ready =
    !!currentBusinessId &&
    !!currentBusiness &&
    !!currentBusiness.status &&
    !!currentBusiness.created_at;
  if (!ready) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <BusinessProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/tentang" element={<Tentang />} />
        <Route path="/fitur" element={<Fitur />} />
        <Route path="/harga" element={<Harga />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/kontak" element={<Kontak />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <Navigate to="/app/dashboard" replace />
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/dashboard"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <OwnerDashboard />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/roles"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <RolePermissionList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/kasir"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <KasirDashboard />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <BusinessRoute>
                <AppLayout>
                  <Admin />
                </AppLayout>
              </BusinessRoute>
            </AdminRoute>
          }
        />

        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <ProductList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/new"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <ProductCreate />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:productId/edit"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <ProductEdit />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:productId"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <ProductDetail />
                  <ProductDelete />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:productId/variants"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <VariantList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:productId/variants/new"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <VariantCreate />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:productId/variants/:variantId"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <VariantDetail />
                  <VariantDelete />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:productId/variants/:variantId/edit"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <VariantEdit />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/suppliers"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <SupplierList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/suppliers/new"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <SupplierCreate />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/suppliers/:supplierId/edit"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <SupplierEdit />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/suppliers/:supplierId"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <SupplierDetail />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <EmployeeList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/new"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <EmployeeCreate />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:employeeId/edit"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <EmployeeEdit />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:employeeId"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <EmployeeDetail />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/purchasing"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <PurchaseOrderList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchasing/new"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <PurchaseOrderCreate />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchasing/:poId/edit"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <PurchaseOrderEdit />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchasing/:poId"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <PurchaseOrderDetail />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <SaleList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales/new"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <SaleCreate />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales/:saleId/edit"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <SaleEdit />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales/:saleId"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <SaleDetail />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        {/* Receivables / Piutang Module */}
        <Route
          path="/receivables"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <ReceivableList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/receivables/new"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <CreditSaleCreate />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/receivables/reports"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <PiutangReports />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/receivables/:receivableId"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <ReceivableDetail />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        {/* Payables / Hutang Module */}
        <Route
          path="/payables"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <PayableList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payables/new"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <PayableCreate />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payables/reports"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <UtangReports />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payables/:payableId"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <PayableDetail />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

<Route
          path="/customers"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <CustomerList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/new"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <CustomerCreate />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:customerId/edit"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <CustomerEdit />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:customerId"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <CustomerDetail />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/promotions"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <PromotionList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/promotions/new"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <PromotionCreate />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/promotions/:promotionId/edit"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <PromotionEdit />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/promotions/:promotionId"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <PromotionDetail />
                  <PromotionDelete />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/loyalty-programs"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <LoyaltyProgramList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/loyalty-programs/new"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <LoyaltyProgramCreate />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/loyalty-programs/:programId/edit"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <LoyaltyProgramEdit />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/loyalty-programs/:programId"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <LoyaltyProgramDetail />
                  <LoyaltyProgramDelete />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/loyalty-programs/:programId/customers"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <CustomerLoyaltyRecordList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/loyalty-programs/:programId/customers/new"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <CustomerLoyaltyRecordCreate />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/loyalty-programs/:programId/customers/:recordId/edit"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <CustomerLoyaltyRecordEdit />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/loyalty-programs/:programId/customers/:recordId"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <CustomerLoyaltyRecordDetail />
                  <CustomerLoyaltyRecordDelete />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance/accounts"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <FinanceAccountList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance/accounts/new"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <FinanceAccountCreate />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance/accounts/:accountId/edit"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <FinanceAccountEdit />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance/accounts/:accountId"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <FinanceAccountDetail />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance/journals"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <FinanceJournalList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance/expenses"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <FinanceExpenseList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        {/* Reports (PART 18 V1) — business-scoped, tenant-isolated */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <ReportsOverview />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/overview"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <ReportsOverview />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/sales"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <ReportsSales />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/purchasing"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <ReportsPurchasing />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/finance"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <ReportsFinance />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/cashflow"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <ReportsCashflow />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/inventory"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <ReportsInventory />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        {/* Notifications (PART 19 V1) — business-scoped, recipient-isolated */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <Notifications />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications/:notificationId"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <NotificationDetail />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        {/* Subscription & Billing (PART 20 V1) */}
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <Billing />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        {/* Settings (PART 18 V1) — business-scoped, tenant-isolated */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <Settings />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/:tab"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <Settings />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        {/* Online Store (PART 22 V1) — Merchant routes */}
        <Route
          path="/stores"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <OnlineStoreList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/stores/create"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <OnlineStoreCreate />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/stores/:storeId/products"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <OnlineStoreProductList />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/stores/:slug/orders"
          element={
            <ProtectedRoute>
              <BusinessRoute>
                <AppLayout>
                  <OnlineStoreOrders />
                </AppLayout>
              </BusinessRoute>
            </ProtectedRoute>
          }
        />

        {/* Public Online Store (AllowAny) — must NOT be behind the auth guard */}
        <Route path="/store/:slug" element={<Storefront />} />
        <Route path="/store/:slug/cart" element={<StorefrontCart />} />
        <Route path="/store/:slug/checkout" element={<StorefrontCheckout />} />
        <Route path="/store/:slug/*" element={<Storefront />} />

        {/* Platform Admin Routes (00. KOPERA PLATFORM / SUPER ADMIN) */}
        <Route
          path="/platform-admin"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminDashboard />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/dashboard"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminDashboard />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/businesses"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminBusinesses />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/businesses/:businessId"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminBusinessDetail />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/audit-logs"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminAuditLogs />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/backups"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminBackups />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/platform-admin/accounts"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminAccounts />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/accounts/:ownerUserId"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminAccountDetail />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/owners"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminOwners />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/owners/:ownerId"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminOwnerDetail />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/users"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminUsers />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/users/:userId"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminUserDetail />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/admins"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminAdmins />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/admins/:adminId"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminAdminDetail />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />

        {/* Domain 06 — Subscription & Plan Governance */}
        <Route
          path="/platform-admin/subscriptions"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminSubscriptions />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/subscriptions/:subscriptionId"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminSubscriptionDetail />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/plans"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminPlans />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/plans/new"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminPlanDetail />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/plans/:planId"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminPlanDetail />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/payments"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminPayments />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />

        {/* Domain 08 — Support Center */}
        <Route
          path="/platform-admin/support"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminSupportCenter />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/support/:ticketId"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminSupportTicketDetail />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />

        {/* Domain 10 — Feature & Module Management */}
        <Route
          path="/platform-admin/modules"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminModules />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin/features"
          element={
            <ProtectedRoute>
              <PlatformLayout>
                <SuperAdminFeatures />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />

        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BusinessProvider>
  );
}
