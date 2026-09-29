import React, { useEffect, useState } from "react";
import {
  Outlet,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Package,
  Calculator,
  Users,
  Factory,
  ShieldCheck,
  LogOut,
  Menu,
  Globe,
  BarChart3,
  X,
  ChevronDown,
} from "lucide-react";
import { translations } from "../data/translations";

const SALES_ITEMS = [
  { to: "/app/sales/customer", key: "customer", fallback: "Customer" },
  { to: "/app/sales/customer-ledger", key: "customerLedger", fallback: "Customer Ledger" },
  { to: "/app/sales/rate-list", key: "rateList", fallback: "Rate List" },
  { to: "/app/sales/sale-order", key: "saleOrder", fallback: "Sale Order" },
  { to: "/app/sales/invoice", key: "salesInvoice", fallback: "Sales Invoice" },
  { to: "/app/sales/return", key: "salesReturn", fallback: "Sales Return" },
  { divider: true },
  { to: "/app/sales/reports", key: "salesReport", fallback: "Sales Report" },
];

const PURCHASE_ITEMS = [
  { to: "/app/purchase/supplier", key: "supplier", fallback: "Supplier" },
  { to: "/app/purchase/rate", key: "purchaseRate", fallback: "Purchase Rate" },
  { to: "/app/purchase/invoice", key: "purchaseInvoice", fallback: "Purchase Invoice" },
  { to: "/app/purchase/return", key: "purchaseReturn", fallback: "Purchase Return" },
  { to: "/app/purchase/supplier-ledger", key: "supplierLedger", fallback: "Supplier Ledger" },
  { divider: true },
  { to: "/app/purchase/reports", key: "purchaseReport", fallback: "Purchase Report" },
];

const INVENTORY_ITEMS = [
  { to: "/app/inventory/product-type", key: "productType", fallback: "Product Type" },
  { to: "/app/inventory/category", key: "category", fallback: "Category" },
  { to: "/app/inventory/product", key: "product", fallback: "Product" },
  { to: "/app/inventory/unit", key: "unit", fallback: "Unit" },
  { to: "/app/inventory/opening", key: "openingStock", fallback: "Opening Stock" },
  { to: "/app/inventory/receive", key: "stockReceive", fallback: "Stock Receive" },
  { to: "/app/inventory/issue", key: "stockIssue", fallback: "Stock Issue" },
  { to: "/app/inventory/stock-demand", key: "stockDemand", fallback: "Stock Demand" },
  { divider: true },
  { to: "/app/inventory/reports", key: "inventoryReport", fallback: "Inventory Report" },
  { to: "/app/inventory/product-ledger", key: "productLedger", fallback: "Product Ledger" },
];

const ACCOUNT_ITEMS = [
  { to: "/app/accounts/profiles", key: "accountProfiles", fallback: "Profiles" },
  { to: "/app/accounts/groups", key: "accountGroups", fallback: "Account Groups" },
  { to: "/app/accounts/chart", key: "chartOfAccounts", fallback: "Chart of Accounts" },
  { to: "/app/accounts/opening", key: "openingBalance", fallback: "Opening Balance" },
  { to: "/app/accounts/journal", key: "journalVoucher", fallback: "Journal Voucher" },
  { to: "/app/accounts/cashbook", key: "cashBook", fallback: "Cash Book" },
  { to: "/app/accounts/cheques", key: "chequeVouchers", fallback: "Cheque Vouchers" },
  { divider: true },
  { to: "/app/accounts/ledger-summary", key: "ledgerSummary", fallback: "Ledger Summary" },
  { to: "/app/accounts/gl-report", key: "glReport", fallback: "GL Report" },
  { to: "/app/accounts/cash-report", key: "cashBookReport", fallback: "Cash Book Report" },
];

const REPORT_ITEMS = [
  { to: "/app/reports/product-profit-loss", key: "productProfitLoss", fallback: "Product Profit / Loss" },
];

const HR_ITEMS = [
  { to: "/app/hr/employee", key: "employee", fallback: "Employee" },
  { to: "/app/hr/rate", key: "employeeRate", fallback: "Employee Salary" },
  { to: "/app/hr/contractor", key: "contractorManagement", fallback: "Contractor Management" },
  { divider: true },
  { to: "/app/hr/reports", key: "employeeloan", fallback: "Employee Loan" },
];

const ADMIN_ITEMS = [
  { to: "/app/admin/transactions", key: "transactionHistory", fallback: "Transaction History" },
  { to: "/app/permissions", key: "permissions", fallback: "User Permissions" },
];

const PRODUCTION_ITEMS = [
  { to: "/app/production/bom", key: "bom", fallback: "BOM" },
  { to: "/app/production/assembly", key: "assembly", fallback: "Assembly" },
  { to: "/app/production/invoice", key: "prodInvoice", fallback: "Production Invoice" },
  { to: "/app/production/return-invoice", key: "prodReturnInvoice", fallback: "Production Return Invoice" },
  { divider: true },
  { to: "/app/production/reports", key: "prodReports", fallback: "Production Reports" },
];

const DashboardLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [lang, setLang] = useState("en");
  const [openGroups, setOpenGroups] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null") || {};
    } catch {
      return {};
    }
  })();

  const userRole = String(user.role || "employee").toLowerCase();
  const isAdmin = userRole === "admin";
  const t = translations[lang] || translations.en || {};
  const isRTL = lang === "ur";
  const text = (key, fallback) => t?.[key] || fallback;

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("auth_token");
    navigate("/login");
  };

  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  const groupIsActive = (items) =>
    items.some((item) => item.to && !item.divider && isActive(item.to));

  useEffect(() => {
    const groups = {
      sales: SALES_ITEMS,
      purchase: PURCHASE_ITEMS,
      inventory: INVENTORY_ITEMS,
      accounts: ACCOUNT_ITEMS,
      reports: REPORT_ITEMS,
      hr: HR_ITEMS,
      production: PRODUCTION_ITEMS,
      administration: ADMIN_ITEMS,
    };

    const activeEntry = Object.entries(groups).find(([, items]) =>
      groupIsActive(items)
    );

    if (activeEntry) {
      const [key] = activeEntry;
      setOpenGroups((prev) => ({ ...prev, [key]: true }));
    }
  }, [location.pathname]);

  const toggleGroup = (key) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderGroup = (groupKey, label, icon, items) => {
    const open = Boolean(openGroups[groupKey]);
    const activeGroup = groupIsActive(items);

    return (
      <div className="mb-2">
        <button
          type="button"
          onClick={() => toggleGroup(groupKey)}
          className={[
            "group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[12.5px] font-semibold transition-all duration-200",
            open || activeGroup
              ? "bg-[#142B40] text-white"
              : "text-[#9CACBC] hover:bg-[#17344D] hover:text-white",
          ].join(" ")}
        >
          <span className={open || activeGroup ? "text-[#4A86F7]" : "text-[#8294A6] group-hover:text-white"}>
            {icon}
          </span>
          <span className="min-w-0 flex-1 truncate text-left rtl:text-right">{label}</span>
          <ChevronDown
            size={15}
            className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <nav className={`mt-1.5 space-y-1 ${isRTL ? "pr-2" : "pl-2"}`}>
            {items.map((item, index) => {
              if (item.divider) {
                return (
                  <div
                    key={`divider-${groupKey}-${index}`}
                    className="mx-3 my-1.5 border-t border-white/[0.06]"
                  />
                );
              }

              return (
                <SidebarNavLink
                  key={item.to}
                  to={item.to}
                  label={text(item.key, item.fallback)}
                  active={isActive(item.to)}
                  onNavigate={closeMobileSidebar}
                  nested
                  isRTL={isRTL}
                />
              );
            })}
          </nav>
        )}
      </div>
    );
  };

  const navigation = (
    <>
      <div
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-2"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#4F6478 transparent",
          scrollbarGutter: "stable",
        }}
      >
        <div className="mb-2">
          <SidebarNavLink
            to="/app/dashboard"
            label={text("dashboard", "Dashboard")}
            icon={<LayoutDashboard size={17} />}
            active={isActive("/app/dashboard")}
            onNavigate={closeMobileSidebar}
            isRTL={isRTL}
          />
        </div>

        {renderGroup("sales", text("sales", "Sales"), <ShoppingCart size={17} />, SALES_ITEMS)}
        {renderGroup("purchase", text("purchase", "Purchase"), <Truck size={17} />, PURCHASE_ITEMS)}
        {renderGroup("inventory", text("inventory", "Inventory"), <Package size={17} />, INVENTORY_ITEMS)}
        {renderGroup("accounts", text("accounts", "Accounts"), <Calculator size={17} />, ACCOUNT_ITEMS)}
        {renderGroup("reports", text("reports", "Reports"), <BarChart3 size={17} />, REPORT_ITEMS)}
        {renderGroup("hr", text("hr", "HR"), <Users size={17} />, HR_ITEMS)}
        {renderGroup("production", text("production", "Production"), <Factory size={17} />, PRODUCTION_ITEMS)}

        {isAdmin && renderGroup("administration", text("administration", "Administration"), <ShieldCheck size={17} />, ADMIN_ITEMS)}
      </div>

      <div className="mt-2 shrink-0 border-t border-white/[0.07] pt-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#30485F] bg-[#142B40] px-3 text-[13px] font-bold text-white transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut size={17} />
          {text("logout", "Sign out")}
        </button>
      </div>
    </>
  );

  return (
    <div className="camz-app min-h-screen bg-[#F4F7FB]" dir={isRTL ? "rtl" : "ltr"}>
      {/* MOBILE HEADER — same Camz shell */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-[#0C2134] px-4 lg:hidden">
        <Link to="/app/dashboard" className="flex items-center gap-2.5 text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4A86F7] text-sm font-extrabold text-white shadow-sm">
            C
          </div>
          <div>
            <div className="text-[13px] font-extrabold leading-none">Ali Cage</div>
            <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8FA1B3]">ERP</div>
          </div>
        </Link>

        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileSidebarOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white"
        >
          <Menu size={19} />
        </button>
      </header>

      {/* DESKTOP SIDEBAR — exact Camz dimensions/colors */}
      <aside
        className={`fixed inset-y-0 z-50 hidden w-[236px] flex-col border-white/[0.08] bg-[#0C2134] px-4 py-4 lg:flex ${
          isRTL ? "right-0 border-l" : "left-0 border-r"
        }`}
      >
        <Link
          to="/app/dashboard"
          className="mb-4 flex h-[58px] shrink-0 items-center gap-3 border-b border-white/[0.07] pb-3"
        >
          <div className="flex h-[43px] w-[43px] items-center justify-center rounded-xl bg-[#4A86F7] text-lg font-extrabold text-white shadow-sm">
            C
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-extrabold text-white">Ali Cage</div>
            <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#718296]">Business ERP</div>
          </div>
        </Link>

        {navigation}
      </aside>

      {/* MOBILE DRAWER — same Camz colors */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMobileSidebar}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]"
          />

          <aside
            className={`relative flex h-full w-[255px] max-w-[82vw] flex-col border-white/10 bg-[#0C2134] px-4 py-4 text-white shadow-2xl ${
              isRTL ? "mr-auto border-l" : "ml-0 border-r"
            }`}
          >
            <div className="mb-4 flex h-[54px] shrink-0 items-center justify-between border-b border-white/[0.07] pb-3">
              <Link to="/app/dashboard" onClick={closeMobileSidebar} className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4A86F7] text-base font-extrabold text-white">C</div>
                <div>
                  <div className="text-[14px] font-extrabold text-white">Ali Cage</div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#718296]">Business ERP</div>
                </div>
              </Link>

              <button
                type="button"
                aria-label="Close menu"
                onClick={closeMobileSidebar}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.07] text-white transition hover:bg-white/10"
              >
                <X size={17} />
              </button>
            </div>

            {navigation}
          </aside>
        </div>
      )}

      <div className={`min-w-0 ${isRTL ? "lg:mr-[236px]" : "lg:ml-[236px]"}`}>
        {/* DESKTOP HEADER — same Camz shell, Ali controls retained */}
        <header className="sticky top-0 z-30 hidden h-[68px] items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm lg:flex">
          <div>
            <h1 className="text-[22px] font-bold leading-[1.1] text-[#13263A]">Ali Cage ERP</h1>
            <p className="mt-1 text-[11px] leading-[1.4] text-slate-500">Manage sales, accounts, inventory and operations.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "ur" : "en")}
              className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#4A86F7]"
            >
              <Globe size={15} />
              {lang === "en" ? "اردو" : "EN"}
            </button>

            <div className="flex h-9 items-center gap-2 rounded-lg bg-blue-50 px-3 text-[#4A86F7]">
              <ShieldCheck size={16} />
              <div className={isRTL ? "text-left" : "text-right"}>
                <div className="text-[10px] font-extrabold leading-none text-[#13263A]">{user.name || user.username || "User"}</div>
                <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-slate-400">{userRole}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-68px)] min-w-0 overflow-x-hidden bg-[#F4F7FB] p-3 sm:p-4 lg:p-5">
          <Outlet context={{ lang, t, isRTL }} />
        </main>
      </div>
    </div>
  );
};

const SidebarNavLink = ({ to, label, icon, active, onNavigate, nested = false, isRTL = false }) => (
  <Link
    to={to}
    onClick={onNavigate}
    className={[
      "group relative flex items-center overflow-hidden transition-all duration-200",
      nested
        ? "h-9 gap-2.5 rounded-lg px-3 text-[11.5px] font-semibold"
        : "h-10 gap-3 rounded-xl px-3 text-[12.5px] font-semibold",
      active
        ? "bg-[#F7F9FC] text-[#10243A] shadow-sm"
        : "text-[#9CACBC] hover:bg-[#17344D] hover:text-white",
    ].join(" ")}
  >
    {active && (
      <span
        className={`absolute inset-y-0 w-1 bg-[#4A86F7] ${
          isRTL ? "right-0 rounded-l-full" : "left-0 rounded-r-full"
        }`}
      />
    )}

    {nested ? (
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          active ? "bg-[#4A86F7]" : "bg-[#718296] group-hover:bg-white"
        }`}
      />
    ) : (
      <span
        className={
          active
            ? "shrink-0 text-[#4A86F7]"
            : "shrink-0 text-[#8294A6] transition group-hover:text-white"
        }
      >
        {icon}
      </span>
    )}

    <span className="truncate">{label}</span>
  </Link>
);

export default DashboardLayout;
