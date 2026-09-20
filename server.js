const express = require("express");

const app = express();

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
| Allow all origins.
| Must stay BEFORE body parser and all API routes.
|--------------------------------------------------------------------------
*/

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  /*
    Browser preflight request.
    Isko API routes tak jane ki zarurat nahi.
  */
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});

/*
|--------------------------------------------------------------------------
| Body Parsers
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

/*
|--------------------------------------------------------------------------
| Health Routes
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.send("Backend is live - CORS FIXED");
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    cors: "all-origins-enabled",
    timestamp: new Date().toISOString(),
  });
});

/*
|--------------------------------------------------------------------------
| Inventory Routes
|--------------------------------------------------------------------------
*/

const productTypeRoutes =
  require("./routes/productType");

const categoryRoutes =
  require("./routes/category");

const productRoutes =
  require("./routes/product");

const unitRoutes =
  require("./routes/unit");

const openingStockRoutes =
  require("./routes/openingStock");

const stockReceiveRoutes =
  require("./routes/stockReceive");

const stockIssueRoutes =
  require("./routes/stockIssue");

const stockDemandRoutes =
  require("./routes/stockDemand");

const productProfitLossReportRoutes =
  require("./routes/productProfitLossReport");

const departmentRoutes =
  require("./routes/departments");

const inventoryReportRoutes =
  require("./routes/inventoryReport");

const productLedgerRoutes =
  require("./routes/productLedger");

/*
|--------------------------------------------------------------------------
| Sales Routes
|--------------------------------------------------------------------------
*/

const customerRoutes =
  require("./routes/customer");

const salesmanRoutes =
  require("./routes/salesman");

const retailerRoutes =
  require("./routes/retailer");

const areaRoutes =
  require("./routes/area");

const salesRateRoutes =
  require("./routes/rates");

const saleOrderRoutes =
  require("./routes/saleOrder");

const salesInvoiceRoutes =
  require("./routes/salesInvoice");

const salesReturnRoutes =
  require("./routes/salesReturn");

const salesReportRoutes =
  require("./routes/salesReport");

/*
|--------------------------------------------------------------------------
| Purchase Routes
|--------------------------------------------------------------------------
*/

const supplierRoutes =
  require("./routes/supplier");

const purchaseRateRoutes =
  require("./routes/purchaseRate");

const purchaseInvoiceRoutes =
  require("./routes/purchaseInvoice");

const purchaseReturnRoutes =
  require("./routes/purchaseReturn");

const purchaseReportRoutes =
  require("./routes/purchaseReport");

const supplierLedgerRoutes =
  require("./routes/supplierLedger");

/*
|--------------------------------------------------------------------------
| Accounts Routes
|--------------------------------------------------------------------------
*/

const accountGroupsRoutes =
  require("./routes/accountGroups");

const chartOfAccountsRoutes =
  require("./routes/chartOfAccounts");

const journalVoucherRoutes =
  require("./routes/journalVoucher");

const chequeVoucherRoutes =
  require("./routes/chequeVouchers");

const cashBookRoutes =
  require("./routes/cashBook");

const openingBalanceRoutes =
  require("./routes/openingBalance");

const generalLedgerRoutes =
  require("./routes/generalLedger");

const generalLedgersMasterRoutes =
  require("./routes/generalLedgersMaster");

const cashBookReportRoutes =
  require("./routes/cashBookReport");

const ledgerRoutes =
  require("./routes/LedgerRoutes");

const allLedgerSummaryRoutes =
  require("./routes/allLedgerSummary");

/*
|--------------------------------------------------------------------------
| HR Routes
|--------------------------------------------------------------------------
*/

const employeesRoutes =
  require("./routes/employees");

const employeeRatesRoutes =
  require("./routes/employeeRates");

const hrReportsRoutes =
  require("./routes/hrReports");

const employeeLedgerRoutes =
  require("./routes/employeeLedger");

const contractorRoutes =
  require("./routes/contractors");

/*
|--------------------------------------------------------------------------
| Production Routes
|--------------------------------------------------------------------------
*/

const bomRoutes =
  require("./routes/bom");

const assemblyRoutes =
  require("./routes/assembly");

const productionInvoiceRoutes =
  require("./routes/productionInvoice");

const productionReportRoutes =
  require("./routes/productionReport");

const productionReturnInvoiceRoutes =
  require("./routes/productionReturnInvoice");

/*
|--------------------------------------------------------------------------
| Authentication & Permissions Routes
|--------------------------------------------------------------------------
*/

const permissionsRoutes =
  require("./routes/permissions");

const authRoutes =
  require("./routes/authRoutes");

/*
|--------------------------------------------------------------------------
| Authentication API
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth",
  authRoutes
);

/*
|--------------------------------------------------------------------------
| General Ledger API
|--------------------------------------------------------------------------
*/

app.use(
  "/api/ledger",
  ledgerRoutes
);

/*
|--------------------------------------------------------------------------
| Inventory APIs
|--------------------------------------------------------------------------
*/

app.use(
  "/api/product-types",
  productTypeRoutes
);

app.use(
  "/api/categories",
  categoryRoutes
);

app.use(
  "/api/products",
  productRoutes
);

app.use(
  "/api/units",
  unitRoutes
);

app.use(
  "/api/opening-stock",
  openingStockRoutes
);

app.use(
  "/api/stock-receive",
  stockReceiveRoutes
);

app.use(
  "/api/stock-issue",
  stockIssueRoutes
);

app.use(
  "/api/stock-demand",
  stockDemandRoutes
);

app.use(
  "/api/reports/product-profit-loss",
  productProfitLossReportRoutes
);

app.use(
  "/api/departments",
  departmentRoutes
);

app.use(
  "/api/inventory-report",
  inventoryReportRoutes
);

app.use(
  "/api/product-ledger",
  productLedgerRoutes
);

/*
|--------------------------------------------------------------------------
| Sales APIs
|--------------------------------------------------------------------------
*/

app.use(
  "/api/customers",
  customerRoutes
);

app.use(
  "/api/salesmen",
  salesmanRoutes
);

app.use(
  "/api/retailers",
  retailerRoutes
);

app.use(
  "/api/areas",
  areaRoutes
);

app.use(
  "/api/rates",
  salesRateRoutes
);

app.use(
  "/api/sale-orders",
  saleOrderRoutes
);

app.use(
  "/api/sales-invoices",
  salesInvoiceRoutes
);

app.use(
  "/api/sales-returns",
  salesReturnRoutes
);

app.use(
  "/api/sales-report",
  salesReportRoutes
);

/*
|--------------------------------------------------------------------------
| Purchase APIs
|--------------------------------------------------------------------------
*/

app.use(
  "/api/suppliers",
  supplierRoutes
);

app.use(
  "/api/purchase-rates",
  purchaseRateRoutes
);

app.use(
  "/api/purchase-invoices",
  purchaseInvoiceRoutes
);

app.use(
  "/api/purchase-returns",
  purchaseReturnRoutes
);

app.use(
  "/api/purchase-report",
  purchaseReportRoutes
);

app.use(
  "/api/supplier-ledger",
  supplierLedgerRoutes
);

/*
|--------------------------------------------------------------------------
| Accounts APIs
|--------------------------------------------------------------------------
*/

app.use(
  "/api/account-groups",
  accountGroupsRoutes
);

app.use(
  "/api/chart-of-accounts",
  chartOfAccountsRoutes
);

app.use(
  "/api/journal-vouchers",
  journalVoucherRoutes
);

app.use(
  "/api/cheque-vouchers",
  chequeVoucherRoutes
);

app.use(
  "/api/cash-book",
  cashBookRoutes
);

app.use(
  "/api/opening-balances",
  openingBalanceRoutes
);

app.use(
  "/api/general-ledger",
  generalLedgerRoutes
);

app.use(
  "/api/general-ledgers",
  generalLedgersMasterRoutes
);

app.use(
  "/api/cash-book-report",
  cashBookReportRoutes
);

app.use(
  "/api/ledger-summary",
  allLedgerSummaryRoutes
);

/*
|--------------------------------------------------------------------------
| HR APIs
|--------------------------------------------------------------------------
*/

app.use(
  "/api/employees",
  employeesRoutes
);

app.use(
  "/api/employee-rates",
  employeeRatesRoutes
);

app.use(
  "/api/hr-reports",
  hrReportsRoutes
);

app.use(
  "/api/employee-ledger",
  employeeLedgerRoutes
);

app.use(
  "/api/contractors",
  contractorRoutes
);

/*
|--------------------------------------------------------------------------
| Production APIs
|--------------------------------------------------------------------------
*/

app.use(
  "/api/bom",
  bomRoutes
);

app.use(
  "/api/assembly",
  assemblyRoutes
);

app.use(
  "/api/production-invoices",
  productionInvoiceRoutes
);

app.use(
  "/api/production-returns",
  productionReturnInvoiceRoutes
);

app.use(
  "/api/production-report",
  productionReportRoutes
);

/*
|--------------------------------------------------------------------------
| Permissions API
|--------------------------------------------------------------------------
*/

app.use(
  "/api/permissions",
  permissionsRoutes
);

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
| Always keep AFTER all routes.
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message:
      `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Global error:", err);

  return res.status(
    err.status || 500
  ).json({
    success: false,
    message:
      err.message || "Server error",
  });
});

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

const PORT =
  process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `Server chal raha hai port ${PORT}`
    );
  });
}

module.exports = app;
