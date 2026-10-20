// Central catalog for non-admin feature permissions.
// A user only receives permissions explicitly granted by an administrator.
const GROUPS = {
 sales: [
  ["customer","Customer"],["customerLedger","Customer Ledger"],["rateList","Rate List"],["saleOrder","Sale Order"],["salesInvoice","Sales Invoice"],["salesReturn","Sales Return"],["salesReport","Sales Report"],["valuationReport","Valuation Report"]
 ],
 purchase: [
  ["supplier","Supplier"],["purchaseRate","Purchase Rate"],["purchaseInvoice","Purchase Invoice"],["purchaseReturn","Purchase Return"],["supplierLedger","Supplier Ledger"],["purchaseReport","Purchase Report"]
 ],
 inventory: [
  ["productType","Product Type"],["category","Category"],["product","Product"],["unit","Unit"],["openingStock","Opening Stock"],["stockReceive","Stock Receive"],["stockIssue","Stock Issue"],["stockDemand","Stock Demand"],["inventoryReport","Inventory Report"],["productLedger","Product Ledger"]
 ],
 accounts: [
  ["accountProfiles","Account Profiles"],["accountGroups","General Accounts"],["chartOfAccounts","Chart of Accounts"],["openingBalance","Opening Balance"],["journalVoucher","Journal Voucher"],["cashBook","Cash Book"],["chequeVouchers","Cheque Vouchers"],["ledgerSummary","Ledger Summary"],["glReport","General Ledger Report"],["cashBookReport","Cash Book Report"]
 ],
 reports: [["productProfitLoss","Product Profit / Loss"]],
 hr: [["employee","Employee"],["employeeSettings","Employee Settings"],["employeeRate","Payroll"],["employeeloan","Employee Loan"]],
 production: [["bom","BOM"],["bomRateLists","BOM Rate Lists"],["assembly","Assembly"],["prodInvoice","Production Invoice"],["prodReturnInvoice","Production Return Invoice"],["prodReports","Production Reports"]]
};
const keys = new Set(Object.entries(GROUPS).flatMap(([g, items]) => items.map(([key]) => g + "." + key)));
// API prefixes under each module; longest prefix wins. Shared read-only lookup routes
// are handled by the middleware separately, so invoice screens can load names.
const PREFIXES = {
 "/api/customers":"sales.customer",
 "/api/ledger/customer":"sales.customerLedger",
 "/api/ledger":"sales.customerLedger",
 "/api/rates":"sales.rateList",
 "/api/sale-orders":"sales.saleOrder",
 "/api/sales-invoices":"sales.salesInvoice",
 "/api/sales-returns":"sales.salesReturn",
 "/api/sales-report":"sales.salesReport",
 "/api/valuation-report":"sales.valuationReport",
 "/api/suppliers":"purchase.supplier",
 "/api/purchase-rates":"purchase.purchaseRate",
 "/api/scoped-rate-lists":"sales.rateList",
 "/api/purchase-invoices":"purchase.purchaseInvoice",
 "/api/purchase-returns":"purchase.purchaseReturn",
 "/api/supplier-ledger":"purchase.supplierLedger",
 "/api/purchase-report":"purchase.purchaseReport",
 "/api/product-types":"inventory.productType",
 "/api/categories":"inventory.category",
 "/api/products":"inventory.product",
 "/api/units":"inventory.unit",
 "/api/opening-stock":"inventory.openingStock",
 "/api/stock-receive":"inventory.stockReceive",
 "/api/stock-issue":"inventory.stockIssue",
 "/api/stock-demand":"inventory.stockDemand",
 "/api/inventory-report":"inventory.inventoryReport",
 "/api/product-ledger":"inventory.productLedger",
 "/api/reports/product-profit-loss":"reports.productProfitLoss",
 "/api/account-profiles":"accounts.accountProfiles",
 "/api/account-groups":"accounts.accountGroups",
 "/api/chart-of-accounts":"accounts.chartOfAccounts",
 "/api/opening-balances":"accounts.openingBalance",
 "/api/journal-vouchers":"accounts.journalVoucher",
 "/api/cheque-vouchers":"accounts.chequeVouchers",
 "/api/cash-book-report":"accounts.cashBookReport",
 "/api/cash-book":"accounts.cashBook",
 "/api/ledger-summary":"accounts.ledgerSummary",
 "/api/general-ledger":"accounts.glReport",
 "/api/general-ledgers":"accounts.accountGroups",
 "/api/employees/departments":"hr.employeeSettings",
 "/api/employees/designations":"hr.employeeSettings",
 "/api/employees":"hr.employee",
 "/api/departments":"hr.employeeSettings",
 "/api/employee-rates":"hr.employeeRate",
 "/api/payroll":"hr.employeeRate",
 "/api/hr-reports":"hr.employeeloan",
 "/api/employee-ledger":"hr.employee",
 "/api/contractors":"hr.employee",
 "/api/bom-rate-lists":"production.bomRateLists",
 "/api/bom":"production.bom",
 "/api/assembly":"production.assembly",
 "/api/production-invoices":"production.prodInvoice",
 "/api/production-returns":"production.prodReturnInvoice",
 "/api/production-report":"production.prodReports",
 "/api/transaction-history":"administration.transactionHistory",
 "/api/salesmen":"sales.customer",
 "/api/retailers":"sales.customer",
 "/api/areas":"sales.customer"
};
const resolveFeature = (url) => {
 const path = String(url||"").split("?")[0].replace(/\/+$/,"");
 const candidates=Object.keys(PREFIXES).filter(p=>path===p||path.startsWith(p+"/"));
 candidates.sort((a,b)=>b.length-a.length);
 return candidates.length?PREFIXES[candidates[0]]:null;
};
module.exports={GROUPS,keys,PREFIXES,resolveFeature};
