const express = require("express");
const router = express.Router();
const db = require("../db");

/*
 * Supplier Detail Ledger
 *
 * Same response structure as the detailed Customer Ledger so the frontend can
 * use the exact CustomerSalesLedgerPage layout.
 *
 * Compatible with both old and updated schemas:
 * - suppliers.name OR suppliers.supplier_name
 * - purchase_invoices.supplier_id OR purchase_invoices.supplier_name
 */

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function dateOnly(value) {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function isDateInRange(value, fromDate, toDate) {
  const date = dateOnly(value);

  if (!date) return !fromDate && !toDate;
  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;

  return true;
}

function isBeforeDate(value, fromDate) {
  const date = dateOnly(value);
  return Boolean(fromDate && date && date < fromDate);
}

async function tableExists(tableName) {
  const rows = await runQuery("SHOW TABLES LIKE ?", [tableName]);
  return Array.isArray(rows) && rows.length > 0;
}

async function getColumns(tableName) {
  if (!(await tableExists(tableName))) return new Set();

  const rows = await runQuery(`SHOW COLUMNS FROM \`${tableName}\``);
  return new Set(rows.map((row) => row.Field));
}

function firstColumn(columns, candidates) {
  return candidates.find((candidate) => columns.has(candidate)) || null;
}

function sqlColumn(column, alias) {
  return column ? `\`${column}\` AS \`${alias}\`` : `NULL AS \`${alias}\``;
}

async function getSupplier(supplierId) {
  const columns = await getColumns("suppliers");

  if (!columns.size) return null;

  const nameColumn = firstColumn(columns, [
    "supplier_name",
    "name",
    "name_en",
    "company_name",
  ]);
  const phoneColumn = firstColumn(columns, [
    "phone",
    "mobile",
    "contact_no",
    "contact_number",
  ]);
  const cityColumn = firstColumn(columns, [
    "city",
    "city_en",
    "address",
    "location",
  ]);
  const openingColumn = firstColumn(columns, [
    "opening_balance",
    "previous_balance",
    "balance",
  ]);
  const createdColumn = firstColumn(columns, ["created_at", "date"]);

  const rows = await runQuery(
    `
      SELECT
        id,
        ${sqlColumn(nameColumn, "supplier_name")},
        ${sqlColumn(phoneColumn, "phone")},
        ${sqlColumn(cityColumn, "city")},
        ${sqlColumn(openingColumn, "opening_balance")},
        ${sqlColumn(createdColumn, "created_at")}
      FROM suppliers
      WHERE id = ?
      LIMIT 1
    `,
    [supplierId]
  );

  return rows[0] || null;
}

async function getAllSuppliers() {
  const columns = await getColumns("suppliers");

  if (!columns.size) return [];

  const nameColumn = firstColumn(columns, [
    "supplier_name",
    "name",
    "name_en",
    "company_name",
  ]);
  const phoneColumn = firstColumn(columns, [
    "phone",
    "mobile",
    "contact_no",
    "contact_number",
  ]);
  const cityColumn = firstColumn(columns, [
    "city",
    "city_en",
    "address",
    "location",
  ]);
  const openingColumn = firstColumn(columns, [
    "opening_balance",
    "previous_balance",
    "balance",
  ]);

  const orderColumn = nameColumn ? `\`${nameColumn}\`` : "id";

  return runQuery(
    `
      SELECT
        id,
        ${sqlColumn(nameColumn, "supplier_name")},
        ${sqlColumn(nameColumn, "name")},
        ${sqlColumn(phoneColumn, "phone")},
        ${sqlColumn(cityColumn, "city")},
        ${sqlColumn(openingColumn, "opening_balance")}
      FROM suppliers
      ORDER BY ${orderColumn} ASC
    `
  );
}

async function getSupplierInvoices(supplier, fromDate = "", toDate = "") {
  const columns = await getColumns("purchase_invoices");

  if (!columns.size) return [];

  const matchConditions = [];
  const params = [];

  if (columns.has("supplier_id")) {
    matchConditions.push("pi.supplier_id = ?");
    params.push(supplier.id);
  }

  if (columns.has("supplier_name") && cleanText(supplier.supplier_name)) {
    matchConditions.push(
      "LOWER(TRIM(pi.supplier_name)) = LOWER(TRIM(?))"
    );
    params.push(cleanText(supplier.supplier_name));
  }

  if (columns.has("party_id") && columns.has("party_type")) {
    matchConditions.push(
      "(LOWER(TRIM(pi.party_type)) = 'supplier' AND pi.party_id = ?)"
    );
    params.push(supplier.id);
  }

  if (!matchConditions.length) return [];

  const where = [`(${matchConditions.join(" OR ")})`];

  if (fromDate && columns.has("invoice_date")) {
    where.push("DATE(pi.invoice_date) >= DATE(?)");
    params.push(fromDate);
  }

  if (toDate && columns.has("invoice_date")) {
    where.push("DATE(pi.invoice_date) <= DATE(?)");
    params.push(toDate);
  }

  const orderColumn = columns.has("invoice_date")
    ? "pi.invoice_date"
    : "pi.id";

  return runQuery(
    `
      SELECT pi.*
      FROM purchase_invoices pi
      WHERE ${where.join(" AND ")}
      ORDER BY ${orderColumn} ASC, pi.id ASC
    `,
    params
  );
}

async function getInvoiceItems(invoiceIds) {
  if (!invoiceIds.length) return [];
  if (!(await tableExists("purchase_invoice_items"))) return [];

  const itemColumns = await getColumns("purchase_invoice_items");
  const hasProducts = await tableExists("products");
  const productColumns = hasProducts
    ? await getColumns("products")
    : new Set();

  const productNameColumn = firstColumn(productColumns, [
    "product_name",
    "name",
    "name_en",
  ]);

  const join = hasProducts && itemColumns.has("product_id")
    ? "LEFT JOIN products p ON p.id = pii.product_id"
    : "";

  const productExpression =
    hasProducts && productNameColumn
      ? `COALESCE(NULLIF(p.\`${productNameColumn}\`, ''), '')`
      : "''";

  const rows = await runQuery(
    `
      SELECT
        pii.*,
        ${productExpression} AS joined_product_name
      FROM purchase_invoice_items pii
      ${join}
      WHERE pii.invoice_id IN (?)
      ORDER BY pii.invoice_id ASC, pii.id ASC
    `,
    [invoiceIds]
  );

  return rows;
}

function displayProductName(item) {
  return (
    cleanText(item.product_name) ||
    cleanText(item.joined_product_name) ||
    cleanText(item.product_description) ||
    cleanText(item.description) ||
    (item.product_id ? `Product #${item.product_id}` : "Product")
  );
}

function buildInvoiceTransaction(invoice, items) {
  const itemsTotal = items.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0
  );

  const invoiceTotal = toNumber(
    invoice.grand_total ??
      invoice.invoice_total ??
      invoice.total_amount,
    itemsTotal
  );

  const paidAmount = toNumber(
    invoice.credit ??
      invoice.paid_amount ??
      invoice.payment_received
  );

  const totalQty = items.reduce(
    (sum, item) =>
      sum +
      toNumber(
        item.qty ??
          item.quantity ??
          item.pieces_qty ??
          item.carton_qty
      ),
    0
  );

  return {
    id: `PINV-${invoice.id}`,
    source_id: invoice.id,
    type: "invoice",
    date: dateOnly(invoice.invoice_date || invoice.created_at),
    reference_no: cleanText(
      invoice.invoice_no || invoice.reference_no || invoice.id
    ),
    linked_invoice_no: cleanText(invoice.invoice_no),
    description: `Purchase Invoice - ${
      cleanText(invoice.invoice_no) || invoice.id
    }`,
    debit: invoiceTotal,
    credit: paidAmount,
    quantity: totalQty,
    sort_order: 2,
    status: cleanText(invoice.status || invoice.payment_status),
    previous_balance: toNumber(invoice.previous_balance),
    invoice_total: invoiceTotal,
    delivery_charges: toNumber(invoice.delivery_charges),
    discount: toNumber(invoice.discount),
    grand_total: invoiceTotal,
    paid_amount: paidAmount,
    remaining_balance: Math.max(invoiceTotal - paidAmount, 0),
    items_count: items.length,
    items: items.map((item, index) => ({
      id: item.id,
      sr: toNumber(item.sr, index + 1),
      product_id: item.product_id,
      product_name: displayProductName(item),
      description: cleanText(
        item.product_description || item.description
      ),
      category_id: item.category_id,
      category_name: cleanText(item.category_name),
      unit_id: item.unit_id,
      unit_name: cleanText(item.unit_name),
      sale_type: cleanText(
        item.sale_type || item.type_name || "single"
      ),
      product_type: cleanText(item.type_name),
      carton_qty: toNumber(item.carton_qty),
      pieces_qty: toNumber(item.pieces_qty),
      qty: toNumber(
        item.qty ??
          item.quantity ??
          item.pieces_qty ??
          item.carton_qty
      ),
      quantity: toNumber(
        item.quantity ??
          item.qty ??
          item.pieces_qty ??
          item.carton_qty
      ),
      pieces_per_carton: toNumber(item.pieces_per_carton),
      rate: toNumber(item.rate),
      amount: toNumber(item.amount),
    })),
  };
}

async function getSupplierReturns(invoiceIds) {
  if (!invoiceIds.length) return [];
  if (!(await tableExists("purchase_returns"))) return [];

  return runQuery(
    `
      SELECT pr.*
      FROM purchase_returns pr
      WHERE pr.invoice_id IN (?)
      ORDER BY pr.return_date ASC, pr.id ASC
    `,
    [invoiceIds]
  );
}

async function getReturnItems(returnIds) {
  if (!returnIds.length) return [];
  if (!(await tableExists("purchase_return_items"))) return [];

  const itemColumns = await getColumns("purchase_return_items");
  const hasProducts = await tableExists("products");
  const productColumns = hasProducts
    ? await getColumns("products")
    : new Set();

  const productNameColumn = firstColumn(productColumns, [
    "product_name",
    "name",
    "name_en",
  ]);

  const join = hasProducts && itemColumns.has("product_id")
    ? "LEFT JOIN products p ON p.id = pri.product_id"
    : "";

  const productExpression =
    hasProducts && productNameColumn
      ? `COALESCE(NULLIF(p.\`${productNameColumn}\`, ''), '')`
      : "''";

  return runQuery(
    `
      SELECT
        pri.*,
        ${productExpression} AS joined_product_name
      FROM purchase_return_items pri
      ${join}
      WHERE pri.return_id IN (?)
      ORDER BY pri.return_id ASC, pri.id ASC
    `,
    [returnIds]
  );
}

function buildReturnTransaction(purchaseReturn, invoice, items) {
  const itemsTotal = items.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0
  );

  const returnAmount = toNumber(
    purchaseReturn.total_amount ??
      purchaseReturn.credit ??
      purchaseReturn.amount,
    itemsTotal
  );

  const quantity = items.reduce(
    (sum, item) =>
      sum + toNumber(item.quantity ?? item.qty ?? item.return_qty),
    0
  );

  const reference =
    cleanText(purchaseReturn.return_no) ||
    `PR-${purchaseReturn.id}`;

  return {
    id: `PRET-${purchaseReturn.id}`,
    source_id: purchaseReturn.id,
    type: "return",
    date: dateOnly(
      purchaseReturn.return_date || purchaseReturn.created_at
    ),
    reference_no: reference,
    linked_invoice_no: cleanText(invoice?.invoice_no),
    description: `Purchase Return - ${reference}`,
    debit: 0,
    credit: returnAmount,
    quantity,
    sort_order: 3,
    return_mode: cleanText(
      purchaseReturn.return_mode || "automatic"
    ),
    reason: cleanText(purchaseReturn.reason),
    status: cleanText(purchaseReturn.status),
    items_count: items.length,
    items: items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: displayProductName(item),
      description: cleanText(
        item.product_description || item.description
      ),
      product_type: cleanText(item.type_name),
      category_id: item.category_id,
      category_name: cleanText(item.category_name),
      unit_id: item.unit_id,
      unit_name: cleanText(item.unit_name),
      sold_qty: toNumber(item.purchased_qty),
      already_returned_qty: toNumber(
        item.already_returned_qty
      ),
      available_qty: toNumber(item.remaining_qty),
      return_qty: toNumber(
        item.return_qty ?? item.quantity ?? item.qty
      ),
      rate: toNumber(item.rate),
      amount: toNumber(item.amount),
      reason: cleanText(purchaseReturn.reason),
    })),
  };
}

async function getManualLedgerEntries(
  supplierId,
  fromDate = "",
  toDate = ""
) {
  if (!(await tableExists("supplier_ledger"))) return [];

  const columns = await getColumns("supplier_ledger");

  if (!columns.has("supplier_id")) return [];

  const where = ["supplier_id = ?"];
  const params = [supplierId];

  const dateColumn = firstColumn(columns, [
    "entry_date",
    "transaction_date",
    "date",
    "created_at",
  ]);

  if (fromDate && dateColumn) {
    where.push(`DATE(\`${dateColumn}\`) >= DATE(?)`);
    params.push(fromDate);
  }

  if (toDate && dateColumn) {
    where.push(`DATE(\`${dateColumn}\`) <= DATE(?)`);
    params.push(toDate);
  }

  return runQuery(
    `
      SELECT *
      FROM supplier_ledger
      WHERE ${where.join(" AND ")}
      ORDER BY ${dateColumn ? `\`${dateColumn}\`` : "id"} ASC, id ASC
    `,
    params
  );
}

function buildManualTransaction(row) {
  return {
    id: `SLED-${row.id}`,
    source_id: row.id,
    type: "manual",
    date: dateOnly(
      row.entry_date ||
        row.transaction_date ||
        row.date ||
        row.created_at
    ),
    reference_no: cleanText(
      row.reference_no || row.ref_no || row.id
    ),
    linked_invoice_no: "",
    description: cleanText(
      row.description_en ||
        row.description ||
        row.remarks ||
        "Payment / Adjustment"
    ),
    debit: toNumber(row.debit),
    credit: toNumber(row.credit),
    quantity: 0,
    sort_order: 4,
    items_count: 0,
    items: [],
  };
}

async function buildDetailedLedger(
  supplierId,
  fromDate = "",
  toDate = ""
) {
  const supplier = await getSupplier(supplierId);

  if (!supplier) {
    const error = new Error("Supplier not found.");
    error.status = 404;
    throw error;
  }

  const allInvoices = await getSupplierInvoices(supplier, "", "");
  const invoiceIds = allInvoices
    .map((invoice) => Number(invoice.id))
    .filter(Boolean);

  const allInvoiceItems = await getInvoiceItems(invoiceIds);
  const invoiceItemMap = new Map();

  allInvoiceItems.forEach((item) => {
    const key = Number(item.invoice_id);

    if (!invoiceItemMap.has(key)) {
      invoiceItemMap.set(key, []);
    }

    invoiceItemMap.get(key).push(item);
  });

  const allInvoiceTransactions = allInvoices.map((invoice) =>
    buildInvoiceTransaction(
      invoice,
      invoiceItemMap.get(Number(invoice.id)) || []
    )
  );

  const invoiceMap = new Map(
    allInvoices.map((invoice) => [Number(invoice.id), invoice])
  );

  const allReturns = await getSupplierReturns(invoiceIds);
  const returnIds = allReturns
    .map((purchaseReturn) => Number(purchaseReturn.id))
    .filter(Boolean);

  const allReturnItems = await getReturnItems(returnIds);
  const returnItemMap = new Map();

  allReturnItems.forEach((item) => {
    const key = Number(item.return_id);

    if (!returnItemMap.has(key)) {
      returnItemMap.set(key, []);
    }

    returnItemMap.get(key).push(item);
  });

  const allReturnTransactions = allReturns.map((purchaseReturn) =>
    buildReturnTransaction(
      purchaseReturn,
      invoiceMap.get(Number(purchaseReturn.invoice_id)),
      returnItemMap.get(Number(purchaseReturn.id)) || []
    )
  );

  const allManualRows = await getManualLedgerEntries(
    supplierId,
    "",
    ""
  );
  const allManualTransactions =
    allManualRows.map(buildManualTransaction);

  const invoiceTransactions = allInvoiceTransactions.filter(
    (transaction) =>
      isDateInRange(transaction.date, fromDate, toDate)
  );

  const returnTransactions = allReturnTransactions.filter(
    (transaction) =>
      isDateInRange(transaction.date, fromDate, toDate)
  );

  const manualTransactions = allManualTransactions.filter(
    (transaction) =>
      isDateInRange(transaction.date, fromDate, toDate)
  );

  const originalOpeningBalance = toNumber(
    supplier.opening_balance
  );

  const broughtForwardMovement = fromDate
    ? [
        ...allInvoiceTransactions,
        ...allReturnTransactions,
        ...allManualTransactions,
      ]
        .filter((transaction) =>
          isBeforeDate(transaction.date, fromDate)
        )
        .reduce(
          (sum, transaction) =>
            sum +
            toNumber(transaction.debit) -
            toNumber(transaction.credit),
          0
        )
    : 0;

  const openingBalance =
    originalOpeningBalance + broughtForwardMovement;

  const openingTransaction = {
    id: `SOB-${supplierId}`,
    source_id: supplierId,
    type: "opening",
    date: fromDate || "",
    reference_no: "OB",
    linked_invoice_no: "",
    description: fromDate
      ? "Balance Brought Forward"
      : "Opening Balance",
    debit: openingBalance > 0 ? openingBalance : 0,
    credit:
      openingBalance < 0 ? Math.abs(openingBalance) : 0,
    quantity: 0,
    sort_order: 1,
    items_count: 0,
    items: [],
    balance: openingBalance,
  };

  const transactions = [
    ...invoiceTransactions,
    ...returnTransactions,
    ...manualTransactions,
  ].sort((a, b) => {
    const dateCompare = cleanText(a.date).localeCompare(
      cleanText(b.date)
    );

    if (dateCompare !== 0) return dateCompare;
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }

    return cleanText(a.reference_no).localeCompare(
      cleanText(b.reference_no)
    );
  });

  let runningBalance = openingBalance;

  const ledgerTransactions = transactions.map((transaction) => {
    runningBalance +=
      toNumber(transaction.debit) -
      toNumber(transaction.credit);

    return {
      ...transaction,
      balance: runningBalance,
    };
  });

  const totalInvoice = invoiceTransactions.reduce(
    (sum, transaction) =>
      sum + toNumber(transaction.debit),
    0
  );

  const totalReturn = returnTransactions.reduce(
    (sum, transaction) =>
      sum + toNumber(transaction.credit),
    0
  );

  const totalManualDebit = manualTransactions.reduce(
    (sum, transaction) =>
      sum + toNumber(transaction.debit),
    0
  );

  const totalManualCredit = manualTransactions.reduce(
    (sum, transaction) =>
      sum + toNumber(transaction.credit),
    0
  );

  const supplierResponse = {
    id: supplier.id,
    supplier_name: cleanText(supplier.supplier_name),
    name: cleanText(supplier.supplier_name),
    customer_name: cleanText(supplier.supplier_name),
    customer_name_en: cleanText(supplier.supplier_name),
    phone: cleanText(supplier.phone),
    city: cleanText(supplier.city),
    city_en: cleanText(supplier.city),
    opening_balance: originalOpeningBalance,
    brought_forward_balance: openingBalance,
  };

  return {
    supplier: supplierResponse,
    customer: supplierResponse,
    filters: {
      from_date: fromDate || null,
      to_date: toDate || null,
    },
    summary: {
      opening_balance: openingBalance,
      total_invoice: totalInvoice,
      total_return: totalReturn,
      total_manual_debit: totalManualDebit,
      total_manual_credit: totalManualCredit,
      closing_balance: runningBalance,
      invoice_count: invoiceTransactions.length,
      return_count: returnTransactions.length,
      transaction_count: ledgerTransactions.length,
      products_sold_qty: invoiceTransactions.reduce(
        (sum, transaction) =>
          sum + toNumber(transaction.quantity),
        0
      ),
      products_returned_qty: returnTransactions.reduce(
        (sum, transaction) =>
          sum + toNumber(transaction.quantity),
        0
      ),
    },
    opening_transaction: openingTransaction,
    transactions: [
      openingTransaction,
      ...ledgerTransactions,
    ],
  };
}

// Supplier list shaped for the exact Customer Ledger frontend.
router.get("/suppliers", async (req, res) => {
  try {
    const suppliers = await getAllSuppliers();

    res.json({
      success: true,
      data: suppliers,
      suppliers,
    });
  } catch (error) {
    console.error("GET /supplier-ledger/suppliers:", error);

    res.status(500).json({
      success: false,
      message:
        error.message || "Suppliers could not be loaded.",
    });
  }
});

// Detailed supplier ledger.
router.get("/:supplierId/details", async (req, res) => {
  try {
    const supplierId = Number(req.params.supplierId);
    const fromDate = cleanText(req.query.from_date);
    const toDate = cleanText(req.query.to_date);

    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid supplier id is required.",
      });
    }

    if (fromDate && toDate && fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: "From date cannot be after To date.",
      });
    }

    const data = await buildDetailedLedger(
      supplierId,
      fromDate,
      toDate
    );

    return res.json({
      success: true,
      message:
        "Detailed supplier ledger fetched successfully.",
      data,
    });
  } catch (error) {
    console.error(
      "GET /supplier-ledger/:supplierId/details:",
      error
    );

    return res.status(error.status || 500).json({
      success: false,
      message:
        error.message ||
        "Failed to load detailed supplier ledger.",
    });
  }
});

// Existing simple endpoint retained for backward compatibility.
router.get("/", async (req, res) => {
  try {
    const supplierId = Number(req.query.supplier_id);
    const fromDate = cleanText(req.query.from_date);
    const toDate = cleanText(req.query.to_date);

    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      return res.status(400).json({
        success: false,
        error: "supplier_id required",
        message: "supplier_id required",
      });
    }

    const data = await buildDetailedLedger(
      supplierId,
      fromDate,
      toDate
    );

    const transactions = data.transactions.map(
      (transaction) => ({
        id: transaction.id,
        tx_date: transaction.date,
        type:
          transaction.type === "invoice"
            ? "Purchase Invoice"
            : transaction.type === "return"
            ? "Purchase Return"
            : transaction.type === "manual"
            ? "Payment / Adjustment"
            : "Opening Balance",
        ref_no: transaction.reference_no,
        status: transaction.status || "",
        debit: transaction.debit,
        credit: transaction.credit,
        balance: transaction.balance,
      })
    );

    return res.json({
      supplier: data.supplier,
      summary: {
        total_debit: transactions.reduce(
          (sum, transaction) =>
            sum + toNumber(transaction.debit),
          0
        ),
        total_credit: transactions.reduce(
          (sum, transaction) =>
            sum + toNumber(transaction.credit),
          0
        ),
        closing_balance: data.summary.closing_balance,
      },
      transactions,
    });
  } catch (error) {
    console.error("GET /supplier-ledger:", error);

    return res.status(error.status || 500).json({
      success: false,
      error:
        error.message || "Supplier ledger load failed.",
      message:
        error.message || "Supplier ledger load failed.",
    });
  }
});

module.exports = router;
