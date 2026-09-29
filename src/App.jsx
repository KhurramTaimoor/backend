import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AdminLogin from "./pages/AdminLogin";
import DashboardLayout from "./Layouts/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";

import ProtectedRoute from "./components/ProtectedRoute";
import GlobalUxEnhancer from "./components/GlobalUxEnhancer";

import CustomerSalesLedgerPage from "./pages/CustomerSalesLedgerPage";

import ProductTypePage from "./pages/ProductTypePage";
import CategoryPage from "./pages/CategoryPage";
import ProductPage from "./pages/ProductPage";
import UnitPage from "./pages/UnitPage";
import OpeningStockPage from "./pages/OpeningStockPage";
import StockReceivePage from "./pages/StockReceivePage";
import StockIssuePage from "./pages/StockIssuePage";
import InventoryReportPage from "./pages/InventoryReportPage";
import ProductLedgerPage from "./pages/ProductLedgerPage";
import StockDemandPage from "./pages/StockDemandPage";
import ProductProfitLossReportPage from "./pages/ProductProfitLossReportPage";

import CustomerPage from "./pages/CustomerPage";
import SalesmanPage from "./pages/SalesmanPage";
import RetailerPage from "./pages/RetailerPage";
import AreaPage from "./pages/AreaPage";
import RateListPage from "./pages/RateListPage";
import SaleOrderPage from "./pages/SaleOrderPage";
import SalesInvoicePage from "./pages/SalesInvoicePage";
import SalesReturnPage from "./pages/SalesReturnPage";
import SalesReportPage from "./pages/SalesReportPage";
import AllLedgerSummaryPage from "./pages/AllLedgerSummaryPage";

import SupplierPage from "./pages/SupplierPage";
import PurchaseRatePage from "./pages/PurchaseRatePage";
import PurchaseInvoicePage from "./pages/PurchaseInvoicePage";
import PurchaseReturnPage from "./pages/PurchaseReturnPage";
import PurchaseReportPage from "./pages/PurchaseReportPage";
import SupplierLedgerPage from "./pages/SupplierLedgerPage";

import AccountGroupsPage from "./pages/AccountGroupsPage";
import ChartOfAccountsPage from "./pages/ChartOfAccountsPage";
import OpeningBalancePage from "./pages/OpeningBalancePage";
import JournalVoucherPage from "./pages/JournalVoucherPage";
import CashBookPage from "./pages/CashBookPage";
import GeneralLedgerPage from "./pages/GeneralLedgerPage";
import CashBookReportPage from "./pages/CashBookReportPage";
import ChequeVoucherPage from "./pages/ChequeVoucherPage";
import AccountProfilesPage from "./pages/AccountProfilesPage";
import TransactionHistoryPage from "./pages/TransactionHistoryPage";

import DepartmentPage from "./pages/DepartmentPage";
import EmployeePage from "./pages/EmployeePage";
import EmployeeRatePage from "./pages/Employeeratepage";
import HRReportPage from "./pages/HRReportPage";
import EmployeeLedgerPage from "./pages/EmployeeLedgerPage";
import ContractorPage from "./pages/ContractorPage";

import BOMPage from "./pages/BOMPage";
import AssemblyPage from "./pages/AssemblyPage";
import ProductionInvoicePage from "./pages/ProductionInvoicePage";
import ProductionReturnInvoicePage from "./pages/ProductionReturnInvoicePage";
import ProductionReportsPage from "./pages/ProductionReportsPage";

import PermissionsPage from "./pages/PermissionsPage";

function App() {
  return (
    <Router>
      <GlobalUxEnhancer />
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={<LandingPage />}
        />

        <Route
          path="/login"
          element={
            <AuthPage initialTab="login" />
          }
        />

        <Route
          path="/register"
          element={
            <AuthPage initialTab="signup" />
          }
        />

        <Route
          path="/sys-admin/secure-gateway"
          element={<AdminLogin />}
        />

        {/* Protected application routes */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={[
                "admin",
                "manager",
                "employee",
              ]}
            />
          }
        >
          <Route
            path="/app"
            element={<DashboardLayout />}
          >
            <Route
              index
              element={
                <Navigate
                  to="dashboard"
                  replace
                />
              }
            />

            <Route
              path="dashboard"
              element={<DashboardHome />}
            />

            {/* Sales */}
            <Route
              path="sales/customer"
              element={<CustomerPage />}
            />

            <Route
              path="sales/customer-ledger"
              element={
                <CustomerSalesLedgerPage />
              }
            />

            <Route
              path="sales/salesman"
              element={<SalesmanPage />}
            />

            <Route
              path="sales/retailer"
              element={<RetailerPage />}
            />

            <Route
              path="sales/area"
              element={<AreaPage />}
            />

            <Route
              path="sales/rate-list"
              element={<RateListPage />}
            />

            <Route
              path="sales/sale-order"
              element={<SaleOrderPage />}
            />

            <Route
              path="sales/invoice"
              element={<SalesInvoicePage />}
            />

            <Route
              path="sales/return"
              element={<SalesReturnPage />}
            />

            <Route
              path="sales/reports"
              element={<SalesReportPage />}
            />

            {/* Purchase */}
            <Route
              path="purchase/supplier"
              element={<SupplierPage />}
            />

            <Route
              path="purchase/rate"
              element={<PurchaseRatePage />}
            />

            <Route
              path="purchase/invoice"
              element={
                <PurchaseInvoicePage />
              }
            />

            <Route
              path="purchase/return"
              element={<PurchaseReturnPage />}
            />

            <Route
              path="purchase/supplier-ledger"
              element={<SupplierLedgerPage />}
            />

            <Route
              path="purchase/reports"
              element={<PurchaseReportPage />}
            />

            {/* Inventory */}
            <Route
              path="inventory/product-type"
              element={<ProductTypePage />}
            />

            <Route
              path="inventory/category"
              element={<CategoryPage />}
            />

            <Route
              path="inventory/product"
              element={<ProductPage />}
            />

            <Route
              path="inventory/unit"
              element={<UnitPage />}
            />

            <Route
              path="inventory/opening"
              element={<OpeningStockPage />}
            />

            <Route
              path="inventory/receive"
              element={<StockReceivePage />}
            />

            <Route
              path="inventory/issue"
              element={<StockIssuePage />}
            />

            <Route
              path="inventory/stock-demand"
              element={<StockDemandPage />}
            />

            <Route
              path="inventory/reports"
              element={
                <InventoryReportPage />
              }
            />

            <Route
              path="inventory/product-ledger"
              element={<ProductLedgerPage />}
            />

            {/* Accounts */}
            <Route
              path="accounts/profiles"
              element={<AccountProfilesPage />}
            />

            <Route
              path="accounts/groups"
              element={<AccountGroupsPage />}
            />

            <Route
              path="accounts/chart"
              element={
                <ChartOfAccountsPage />
              }
            />

            <Route
              path="accounts/opening"
              element={<OpeningBalancePage />}
            />

            <Route
              path="accounts/journal"
              element={<JournalVoucherPage />}
            />

            <Route
              path="accounts/cashbook"
              element={<CashBookPage />}
            />

            <Route
              path="accounts/cheques"
              element={<ChequeVoucherPage />}
            />

            <Route
              path="accounts/ledger-summary"
              element={
                <AllLedgerSummaryPage />
              }
            />

            <Route
              path="accounts/gl-report"
              element={<GeneralLedgerPage />}
            />

            <Route
              path="accounts/cash-report"
              element={
                <CashBookReportPage />
              }
            />

            {/* Reports */}
            <Route
              path="reports/product-profit-loss"
              element={
                <ProductProfitLossReportPage />
              }
            />

            {/* HR */}
            <Route
              path="hr/departments"
              element={<DepartmentPage />}
            />

            <Route
              path="hr/employee"
              element={<EmployeePage />}
            />

            <Route
              path="hr/rate"
              element={<EmployeeRatePage />}
            />

            <Route
              path="hr/contractor"
              element={<ContractorPage />}
            />

            <Route
              path="hr/reports"
              element={<HRReportPage />}
            />

            <Route
              path="hr/ledger"
              element={<EmployeeLedgerPage />}
            />

            {/* Production */}
            <Route
              path="production/bom"
              element={<BOMPage />}
            />

            <Route
              path="production/assembly"
              element={<AssemblyPage />}
            />

            <Route
              path="production/invoice"
              element={
                <ProductionInvoicePage />
              }
            />

            <Route
              path="production/return-invoice"
              element={
                <ProductionReturnInvoicePage />
              }
            />

            <Route
              path="production/reports"
              element={
                <ProductionReportsPage />
              }
            />

            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route
                path="admin/transactions"
                element={<TransactionHistoryPage />}
              />

              <Route
                path="permissions"
                element={<PermissionsPage />}
              />
            </Route>

            {/* Invalid /app URL stays inside dashboard */}
            <Route
              path="*"
              element={
                <Navigate
                  to="dashboard"
                  replace
                />
              }
            />
          </Route>
        </Route>

        {/* Global fallback */}
        <Route
          path="*"
          element={
            <Navigate
              to="/app/dashboard"
              replace
            />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
