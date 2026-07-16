const express = require("express");
const router = express.Router();
const db = require("../db");

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
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

function addDateFilters({ alias, column, fromDate, toDate, where, params }) {
  if (fromDate) {
    where.push(`${alias}.${column} >= ?`);
    params.push(fromDate);
  }
  if (toDate) {
    where.push(`${alias}.${column} <= ?`);
    params.push(toDate);
  }
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

function buildDisplayProductName(item) {
  return (
    cleanText(item.product_name) ||
    cleanText(item.product_description) ||
    cleanText(item.description) ||
    cleanText(item.manual_product_name) ||
    (item.product_id ? `Product #${item.product_id}` : "Product")
  );
}

function buildInvoiceTransaction(invoice, items) {
  const itemsTotal = items.reduce((sum, item) => sum + toNumber(item.amount), 0);
  const invoiceTotalValue = invoice.invoice_total ?? invoice.total_amount;
  const invoiceTotal =
    invoiceTotalValue === null || invoiceTotalValue === undefined || invoiceTotalValue === ""
      ? itemsTotal
      : toNumber(invoiceTotalValue, itemsTotal);
  const deliveryCharges = toNumber(invoice.delivery_charges);
  const discount = toNumber(invoice.discount);

  // previous_balance ko debit mein dobara add nahi karna, warna ledger double count hota hai.
  const debit = invoiceTotal + deliveryCharges - discount;
  const totalQty = items.reduce(
    (sum, item) => sum + toNumber(item.qty ?? item.quantity ?? item.pieces_qty ?? item.carton_qty),
    0
  );

  return {
    id: `INV-${invoice.id}`,
    source_id: invoice.id,
    type: "invoice",
    date: dateOnly(invoice.invoice_date),
    reference_no: cleanText(invoice.invoice_no || invoice.reference_no || invoice.id),
    linked_invoice_no: cleanText(invoice.invoice_no),
    description: `Sales Invoice - ${cleanText(invoice.invoice_no) || invoice.id}`,
    debit,
    credit: 0,
    quantity: totalQty,
    sort_order: 2,
    shipment_to: cleanText(invoice.shipment_to),
    address: cleanText(invoice.address),
    status: cleanText(invoice.status),
    previous_balance: toNumber(invoice.previous_balance),
    invoice_total: invoiceTotal,
    delivery_charges: deliveryCharges,
    discount,
    grand_total: toNumber(
      invoice.grand_total,
      invoiceTotal + toNumber(invoice.previous_balance) + deliveryCharges - discount
    ),
    items_count: items.length,
    items: items.map((item, index) => ({
      id: item.id,
      sr: toNumber(item.sr, index + 1),
      product_id: item.product_id,
      product_name: buildDisplayProductName(item),
      description: cleanText(item.product_description || item.description),
      category_id: item.category_id,
      category_name: cleanText(item.category_name),
      unit_id: item.unit_id,
      unit_name: cleanText(item.unit_name),
      sale_type: cleanText(item.sale_type || "single"),
      carton_qty: toNumber(item.carton_qty),
      pieces_qty: toNumber(item.pieces_qty),
      qty: toNumber(item.qty ?? item.quantity ?? item.pieces_qty ?? item.carton_qty),
      quantity: toNumber(item.quantity ?? item.qty ?? item.pieces_qty ?? item.carton_qty),
      pieces_per_carton: toNumber(item.pieces_per_carton),
      rate: toNumber(item.rate),
      amount: toNumber(item.amount),
    })),
  };
}

function groupReturnTransactions(rows, invoiceMap) {
  const groups = new Map();

  rows.forEach((row) => {
    const groupKey = cleanText(row.return_no) || `RET-${row.id}`;
    if (!groups.has(groupKey)) {
      const invoice = invoiceMap.get(Number(row.invoice_id)) || invoiceMap.get(cleanText(row.invoice_ref));
      groups.set(groupKey, {
        id: `RET-${groupKey}`,
        source_id: row.id,
        type: "return",
        date: dateOnly(row.return_date),
        reference_no: groupKey,
        linked_invoice_no: cleanText(row.invoice_ref || row.invoice_no),
        description: `Sales Return - ${groupKey}`,
        debit: 0,
        credit: 0,
        quantity: 0,
        sort_order: 3,
        return_mode: cleanText(row.return_mode),
        reason: cleanText(row.reason),
        status: cleanText(row.status),
        shipment_to: cleanText(invoice?.shipment_to),
        address: cleanText(invoice?.address),
        items_count: 0,
        items: [],
      });
    }

    const group = groups.get(groupKey);
    const amount = toNumber(row.return_amount, toNumber(row.return_qty) * toNumber(row.rate));
    group.credit += amount;
    group.quantity += toNumber(row.return_qty);
    group.items.push({
      id: row.id,
      invoice_item_id: row.invoice_item_id,
      product_id: row.product_id,
      product_name: buildDisplayProductName(row),
      description: cleanText(row.product_description),
      product_type: cleanText(row.product_type),
      category_id: row.category_id,
      category_name: cleanText(row.category_name),
      unit_id: row.unit_id,
      unit_name: cleanText(row.unit_name),
      sold_qty: toNumber(row.sold_qty),
      already_returned_qty: toNumber(row.already_returned_qty),
      available_qty: toNumber(row.available_qty),
      return_qty: toNumber(row.return_qty),
      rate: toNumber(row.rate),
      amount,
      reason: cleanText(row.reason),
    });
    group.items_count = group.items.length;
  });

  return Array.from(groups.values());
}

function buildManualTransaction(row) {
  return {
    id: `LED-${row.id}`,
    source_id: row.id,
    type: "manual",
    date: dateOnly(row.entry_date),
    reference_no: cleanText(row.reference_no || row.id),
    linked_invoice_no: "",
    description: cleanText(row.description_en || row.description || "Ledger Entry"),
    debit: toNumber(row.debit),
    credit: toNumber(row.credit),
    quantity: 0,
    sort_order: 4,
    items_count: 0,
    items: [],
  };
}

async function getCustomer(customerId) {
  const rows = await runQuery(
    `SELECT id, customer_name_en, phone, city_en, opening_balance
     FROM customers
     WHERE id = ?
     LIMIT 1`,
    [customerId]
  );
  return rows[0] || null;
}

async function getCustomerInvoices(customerId, fromDate, toDate) {
  const where = [
    `(si.customer_id = ? OR (si.party_type = 'customer' AND si.party_id = ?))`,
  ];
  const params = [customerId, customerId];
  addDateFilters({
    alias: "si",
    column: "invoice_date",
    fromDate,
    toDate,
    where,
    params,
  });

  return runQuery(
    `SELECT si.*
     FROM sales_invoices si
     WHERE ${where.join(" AND ")}
     ORDER BY si.invoice_date ASC, si.id ASC`,
    params
  );
}

async function getInvoiceItems(invoiceIds) {
  if (!invoiceIds.length) return [];

  try {
    return await runQuery(
      `SELECT
         sii.*,
         COALESCE(NULLIF(p.product_name, ''), NULLIF(sii.product_description, ''), NULLIF(sii.description, '')) AS product_name,
         COALESCE(u.unit_name, '') AS unit_name,
         COALESCE(c.category_name, '') AS category_name
       FROM sales_invoice_items sii
       LEFT JOIN products p ON p.id = sii.product_id
       LEFT JOIN units u ON u.id = sii.unit_id
       LEFT JOIN categories c ON c.id = sii.category_id
       WHERE sii.invoice_id IN (?)
       ORDER BY sii.invoice_id ASC, sii.sr ASC, sii.id ASC`,
      [invoiceIds]
    );
  } catch (error) {
    // Purani database schema mein category/unit joins fail hon to basic item data phir bhi return ho.
    console.warn("Detailed invoice item joins failed, using basic item query:", error.message);
    return runQuery(
      `SELECT *
       FROM sales_invoice_items
       WHERE invoice_id IN (?)
       ORDER BY invoice_id ASC, sr ASC, id ASC`,
      [invoiceIds]
    );
  }
}

async function getCustomerReturns({ customerId, invoices, fromDate, toDate }) {
  const invoiceIds = invoices.map((invoice) => Number(invoice.id)).filter(Boolean);
  const invoiceNumbers = invoices.map((invoice) => cleanText(invoice.invoice_no)).filter(Boolean);

  const customerMatch = [`(sr.party_type = 'customer' AND sr.party_id = ?)`];
  const customerParams = [customerId];

  if (invoiceIds.length) {
    customerMatch.push(`sr.invoice_id IN (?)`);
    customerParams.push(invoiceIds);
  }
  if (invoiceNumbers.length) {
    customerMatch.push(`sr.invoice_ref IN (?)`);
    customerParams.push(invoiceNumbers);
    customerMatch.push(`sr.invoice_no IN (?)`);
    customerParams.push(invoiceNumbers);
  }

  const where = [`(${customerMatch.join(" OR ")})`];
  const params = [...customerParams];
  addDateFilters({
    alias: "sr",
    column: "return_date",
    fromDate,
    toDate,
    where,
    params,
  });

  return runQuery(
    `SELECT sr.*
     FROM sales_returns sr
     WHERE ${where.join(" AND ")}
     ORDER BY sr.return_date ASC, sr.return_no ASC, sr.id ASC`,
    params
  );
}

async function getManualLedgerEntries(customerId, fromDate, toDate) {
  const where = ["cl.customer_id = ?"];
  const params = [customerId];
  addDateFilters({
    alias: "cl",
    column: "entry_date",
    fromDate,
    toDate,
    where,
    params,
  });

  try {
    return await runQuery(
      `SELECT cl.*
       FROM customer_ledger cl
       WHERE ${where.join(" AND ")}
       ORDER BY cl.entry_date ASC, cl.id ASC`,
      params
    );
  } catch (error) {
    // customer_ledger optional hai; table absent ho to detail ledger invoice/return ke sath chale.
    if (error && (error.code === "ER_NO_SUCH_TABLE" || error.errno === 1146)) return [];
    throw error;
  }
}

// Detailed customer ledger: invoices + invoice products + grouped returns + manual entries.
router.get("/customer/:customerId/details", async (req, res) => {
  try {
    const customerId = Number(req.params.customerId);
    const fromDate = cleanText(req.query.from_date);
    const toDate = cleanText(req.query.to_date);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({ success: false, message: "Valid customer id is required." });
    }
    if (fromDate && toDate && fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: "From date cannot be after To date.",
      });
    }

    const customer = await getCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }

    // Full customer history load karte hain taa-ke date filter lagne par
    // brought-forward/opening balance mathematically correct rahe.
    const allInvoices = await getCustomerInvoices(customerId, "", "");
    const allInvoiceIds = allInvoices.map((invoice) => Number(invoice.id)).filter(Boolean);
    const allInvoiceItems = await getInvoiceItems(allInvoiceIds);

    const itemMap = new Map();
    allInvoiceItems.forEach((item) => {
      const key = Number(item.invoice_id);
      if (!itemMap.has(key)) itemMap.set(key, []);
      itemMap.get(key).push(item);
    });

    const allInvoiceTransactions = allInvoices.map((invoice) =>
      buildInvoiceTransaction(invoice, itemMap.get(Number(invoice.id)) || [])
    );

    const invoiceMap = new Map();
    allInvoices.forEach((invoice) => {
      invoiceMap.set(Number(invoice.id), invoice);
      if (cleanText(invoice.invoice_no)) invoiceMap.set(cleanText(invoice.invoice_no), invoice);
    });

    // Returns old invoices ke against bhi ho sakte hain, is liye matching ke liye
    // filtered invoices ke bajaye customer ki complete invoice history use hoti hai.
    const allReturnRows = await getCustomerReturns({
      customerId,
      invoices: allInvoices,
      fromDate: "",
      toDate: "",
    });
    const allReturnTransactions = groupReturnTransactions(allReturnRows, invoiceMap);
    const allManualRows = await getManualLedgerEntries(customerId, "", "");
    const allManualTransactions = allManualRows.map(buildManualTransaction);

    const invoiceTransactions = allInvoiceTransactions.filter((transaction) =>
      isDateInRange(transaction.date, fromDate, toDate)
    );
    const returnTransactions = allReturnTransactions.filter((transaction) =>
      isDateInRange(transaction.date, fromDate, toDate)
    );
    const manualTransactions = allManualTransactions.filter((transaction) =>
      isDateInRange(transaction.date, fromDate, toDate)
    );

    const originalOpeningBalance = toNumber(customer.opening_balance);
    const broughtForwardMovement = fromDate
      ? [...allInvoiceTransactions, ...allReturnTransactions, ...allManualTransactions]
          .filter((transaction) => isBeforeDate(transaction.date, fromDate))
          .reduce(
            (sum, transaction) =>
              sum + toNumber(transaction.debit) - toNumber(transaction.credit),
            0
          )
      : 0;
    const openingBalance = originalOpeningBalance + broughtForwardMovement;

    const openingTransaction = {
      id: `OB-${customerId}`,
      source_id: customerId,
      type: "opening",
      date: fromDate || "",
      reference_no: "OB",
      linked_invoice_no: "",
      description: fromDate ? "Balance Brought Forward" : "Opening Balance",
      debit: openingBalance > 0 ? openingBalance : 0,
      credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
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
      const dateCompare = cleanText(a.date).localeCompare(cleanText(b.date));
      if (dateCompare !== 0) return dateCompare;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return cleanText(a.reference_no).localeCompare(cleanText(b.reference_no));
    });

    let runningBalance = openingBalance;
    const ledgerTransactions = transactions.map((transaction) => {
      runningBalance += toNumber(transaction.debit) - toNumber(transaction.credit);
      return { ...transaction, balance: runningBalance };
    });

    const totalInvoice = invoiceTransactions.reduce(
      (sum, transaction) => sum + toNumber(transaction.debit),
      0
    );
    const totalReturn = returnTransactions.reduce(
      (sum, transaction) => sum + toNumber(transaction.credit),
      0
    );
    const totalManualDebit = manualTransactions.reduce(
      (sum, transaction) => sum + toNumber(transaction.debit),
      0
    );
    const totalManualCredit = manualTransactions.reduce(
      (sum, transaction) => sum + toNumber(transaction.credit),
      0
    );

    const responseCustomer = {
      id: customer.id,
      customer_name: cleanText(customer.customer_name_en),
      customer_name_en: cleanText(customer.customer_name_en),
      phone: cleanText(customer.phone),
      city: cleanText(customer.city_en),
      city_en: cleanText(customer.city_en),
      opening_balance: originalOpeningBalance,
      brought_forward_balance: openingBalance,
    };

    return res.json({
      success: true,
      message: "Detailed customer ledger fetched successfully.",
      data: {
        customer: responseCustomer,
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
            (sum, transaction) => sum + toNumber(transaction.quantity),
            0
          ),
          products_returned_qty: returnTransactions.reduce(
            (sum, transaction) => sum + toNumber(transaction.quantity),
            0
          ),
        },
        opening_transaction: openingTransaction,
        transactions: [openingTransaction, ...ledgerTransactions],
      },
    });
  } catch (error) {
    console.error("GET /api/ledger/customer/:customerId/details:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load detailed customer ledger.",
    });
  }
});

// Existing all-customer ledger endpoint retained for backward compatibility.
router.get("/", async (req, res) => {
  try {
    const fromDate = cleanText(req.query.from_date);
    const toDate = cleanText(req.query.to_date);

    const invoiceWhere = [];
    const invoiceParams = [];
    const returnWhere = [];
    const returnParams = [];

    addDateFilters({
      alias: "si",
      column: "invoice_date",
      fromDate,
      toDate,
      where: invoiceWhere,
      params: invoiceParams,
    });
    addDateFilters({
      alias: "sr",
      column: "return_date",
      fromDate,
      toDate,
      where: returnWhere,
      params: returnParams,
    });

    const invoiceWhereSql = invoiceWhere.length ? `WHERE ${invoiceWhere.join(" AND ")}` : "";
    const returnWhereSql = returnWhere.length ? `WHERE ${returnWhere.join(" AND ")}` : "";

    const invoices = await runQuery(
      `SELECT
         CONCAT('INV-', si.id) AS id,
         DATE_FORMAT(si.invoice_date, '%Y-%m-%d') AS date,
         COALESCE(si.customer_id, CASE WHEN si.party_type = 'customer' THEN si.party_id END) AS customer_id,
         COALESCE(c.customer_name_en, si.party_name, si.customer_name_en, '—') AS customer_name,
         'Sale Invoice' AS voucher_type,
         CONCAT('Sale Invoice - ', si.invoice_no) AS description,
         si.invoice_no AS ref,
         COALESCE(c.opening_balance, 0) AS opening_balance,
         GREATEST(
           COALESCE(si.invoice_total, si.total_amount, 0)
           + COALESCE(si.delivery_charges, 0)
           - COALESCE(si.discount, 0),
           0
         ) AS debit,
         0 AS credit,
         2 AS sort_order
       FROM sales_invoices si
       LEFT JOIN customers c
         ON c.id = COALESCE(si.customer_id, CASE WHEN si.party_type = 'customer' THEN si.party_id END)
       ${invoiceWhereSql}
       ORDER BY si.invoice_date ASC, si.id ASC`,
      invoiceParams
    );

    const returns = await runQuery(
      `SELECT
         CONCAT('RET-', sr.id) AS id,
         DATE_FORMAT(sr.return_date, '%Y-%m-%d') AS date,
         COALESCE(sr.party_id, si.customer_id) AS customer_id,
         COALESCE(c.customer_name_en, sr.party_name, sr.customer_name, '—') AS customer_name,
         'Sale Return' AS voucher_type,
         CONCAT('Sale Return - ', sr.return_no) AS description,
         sr.return_no AS ref,
         0 AS opening_balance,
         0 AS debit,
         COALESCE(sr.return_amount, 0) AS credit,
         3 AS sort_order
       FROM sales_returns sr
       LEFT JOIN sales_invoices si
         ON si.id = sr.invoice_id OR si.invoice_no = sr.invoice_ref
       LEFT JOIN customers c
         ON c.id = COALESCE(sr.party_id, si.customer_id)
       ${returnWhereSql}
       ORDER BY sr.return_date ASC, sr.id ASC`,
      returnParams
    );

    const customerOpeningMap = new Map();
    [...invoices, ...returns].forEach((row) => {
      const customerId = Number(row.customer_id) || 0;
      if (!customerId || customerOpeningMap.has(customerId)) return;
      const opening = toNumber(row.opening_balance);
      customerOpeningMap.set(customerId, {
        id: `OB-${customerId}`,
        date: fromDate || "",
        customer_id: customerId,
        customer_name: row.customer_name || "—",
        voucher_type: "Opening Balance",
        description: "Opening balance carried forward",
        ref: "OB",
        opening_balance: opening,
        debit: opening > 0 ? opening : 0,
        credit: opening < 0 ? Math.abs(opening) : 0,
        sort_order: 1,
      });
    });

    const combined = [
      ...Array.from(customerOpeningMap.values()),
      ...invoices,
      ...returns,
    ].sort((a, b) => {
      if (Number(a.customer_id) !== Number(b.customer_id)) {
        return Number(a.customer_id) - Number(b.customer_id);
      }
      const dateCompare = cleanText(a.date).localeCompare(cleanText(b.date));
      if (dateCompare !== 0) return dateCompare;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return cleanText(a.ref).localeCompare(cleanText(b.ref));
    });

    const balanceByCustomer = new Map();
    const ledger = combined.map((row) => {
      const customerId = Number(row.customer_id) || 0;
      const current = toNumber(balanceByCustomer.get(customerId));
      const balance = current + toNumber(row.debit) - toNumber(row.credit);
      balanceByCustomer.set(customerId, balance);
      return {
        ...row,
        debit: toNumber(row.debit),
        credit: toNumber(row.credit),
        balance,
      };
    });

    return res.json({
      success: true,
      message: "Ledger fetched successfully.",
      data: ledger,
    });
  } catch (error) {
    console.error("GET /api/ledger:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load ledger.",
    });
  }
});

module.exports = router;
