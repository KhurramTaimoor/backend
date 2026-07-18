const express = require("express");
const router = express.Router();
const db = require("../db");

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (error, rows) => {
      if (error) return reject(error);
      resolve(Array.isArray(rows) ? rows : []);
    });
  });
}

async function safeQuery(sql, params = []) {
  try {
    return await runQuery(sql, params);
  } catch (error) {
    const optionalSchemaErrors = new Set([
      "ER_NO_SUCH_TABLE",
      "ER_BAD_FIELD_ERROR",
      "ER_BAD_TABLE_ERROR",
    ]);

    if (optionalSchemaErrors.has(error?.code) || [1054, 1146].includes(error?.errno)) {
      console.warn("Ledger summary optional source skipped:", error.message);
      return [];
    }

    throw error;
  }
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value) {
  return String(value ?? "").trim();
}

function dateOnly(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

function isBefore(dateValue, fromDate) {
  const date = dateOnly(dateValue);
  return Boolean(fromDate && date && date < fromDate);
}

function isInRange(dateValue, fromDate, toDate) {
  const date = dateOnly(dateValue);
  if (!date) return !fromDate && !toDate;
  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;
  return true;
}

function createBucket(base = {}) {
  return {
    opening_balance: number(base.opening_balance),
    total_debit: 0,
    total_credit: 0,
    transaction_count: 0,
  };
}

function applyTransaction(bucket, transaction, fromDate, toDate) {
  const debit = number(transaction.debit);
  const credit = number(transaction.credit);

  if (isBefore(transaction.tx_date, fromDate)) {
    bucket.opening_balance += debit - credit;
    return;
  }

  if (isInRange(transaction.tx_date, fromDate, toDate)) {
    bucket.total_debit += debit;
    bucket.total_credit += credit;
    bucket.transaction_count += 1;
  }
}

function finalizeRow(row, bucket) {
  return {
    ...row,
    opening_balance: number(bucket.opening_balance),
    total_debit: number(bucket.total_debit),
    total_credit: number(bucket.total_credit),
    closing_balance:
      number(bucket.opening_balance) +
      number(bucket.total_debit) -
      number(bucket.total_credit),
    transaction_count: number(bucket.transaction_count),
  };
}

async function loadCustomers(fromDate, toDate) {
  const customers = await safeQuery(`
    SELECT
      id,
      customer_name_en AS name,
      phone,
      city_en AS city,
      COALESCE(opening_balance, 0) AS opening_balance
    FROM customers
    ORDER BY customer_name_en ASC
  `);

  const invoices = await safeQuery(`
    SELECT
      COALESCE(
        customer_id,
        CASE WHEN party_type = 'customer' THEN party_id END
      ) AS entity_id,
      invoice_date AS tx_date,
      GREATEST(
        COALESCE(invoice_total, total_amount, 0)
        + COALESCE(delivery_charges, 0)
        - COALESCE(discount, 0),
        0
      ) AS debit,
      0 AS credit
    FROM sales_invoices
  `);

  const returns = await safeQuery(`
    SELECT
      COALESCE(
        sr.party_id,
        si.customer_id,
        CASE WHEN si.party_type = 'customer' THEN si.party_id END
      ) AS entity_id,
      sr.return_date AS tx_date,
      0 AS debit,
      COALESCE(sr.return_amount, 0) AS credit
    FROM sales_returns sr
    LEFT JOIN sales_invoices si
      ON si.id = sr.invoice_id OR si.invoice_no = sr.invoice_ref
  `);

  const manualEntries = await safeQuery(`
    SELECT
      customer_id AS entity_id,
      entry_date AS tx_date,
      COALESCE(debit, 0) AS debit,
      COALESCE(credit, 0) AS credit
    FROM customer_ledger
  `);

  const buckets = new Map(
    customers.map((customer) => [
      Number(customer.id),
      createBucket({ opening_balance: customer.opening_balance }),
    ])
  );

  [...invoices, ...returns, ...manualEntries].forEach((transaction) => {
    const id = Number(transaction.entity_id);
    const bucket = buckets.get(id);
    if (bucket) applyTransaction(bucket, transaction, fromDate, toDate);
  });

  return customers.map((customer) =>
    finalizeRow(
      {
        id: `customer-${customer.id}`,
        entity_id: Number(customer.id),
        name: text(customer.name) || `Customer #${customer.id}`,
        code: "",
        type: "customer",
        category: "Customer",
        unit: "PKR",
        is_quantity: false,
        detail_path: `/app/sales/customer-ledger?customer_id=${customer.id}`,
        meta: [text(customer.phone), text(customer.city)].filter(Boolean).join(" · "),
      },
      buckets.get(Number(customer.id)) || createBucket()
    )
  );
}

async function loadSuppliers(fromDate, toDate) {
  const suppliers = await safeQuery(`
    SELECT
      id,
      name,
      COALESCE(opening_balance, 0) AS opening_balance
    FROM suppliers
    ORDER BY name ASC
  `);

  const purchases = await safeQuery(`
    SELECT
      supplier_id AS entity_id,
      invoice_date AS tx_date,
      COALESCE(total_amount, 0) AS debit,
      0 AS credit
    FROM purchase_invoices
  `);

  const returns = await safeQuery(`
    SELECT
      pi.supplier_id AS entity_id,
      pr.return_date AS tx_date,
      0 AS debit,
      COALESCE(pr.total_amount, 0) AS credit
    FROM purchase_returns pr
    INNER JOIN purchase_invoices pi ON pi.id = pr.invoice_id
  `);

  const buckets = new Map(
    suppliers.map((supplier) => [
      Number(supplier.id),
      createBucket({ opening_balance: supplier.opening_balance }),
    ])
  );

  [...purchases, ...returns].forEach((transaction) => {
    const bucket = buckets.get(Number(transaction.entity_id));
    if (bucket) applyTransaction(bucket, transaction, fromDate, toDate);
  });

  return suppliers.map((supplier) =>
    finalizeRow(
      {
        id: `supplier-${supplier.id}`,
        entity_id: Number(supplier.id),
        name: text(supplier.name) || `Supplier #${supplier.id}`,
        code: "",
        type: "supplier",
        category: "Supplier",
        unit: "PKR",
        is_quantity: false,
        detail_path: `/app/purchase/supplier-ledger?supplier_id=${supplier.id}`,
        meta: "",
      },
      buckets.get(Number(supplier.id)) || createBucket()
    )
  );
}

async function loadEmployees(fromDate, toDate) {
  const employees = await safeQuery(`
    SELECT
      e.id,
      e.full_name AS name,
      COALESCE(d.department_name, '') AS department
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    ORDER BY e.full_name ASC
  `);

  const payroll = await safeQuery(`
    SELECT
      employee_id AS entity_id,
      created_at AS tx_date,
      COALESCE(net_salary, 0) AS salary_amount,
      LOWER(COALESCE(status, '')) AS payment_status
    FROM payroll
  `);

  const buckets = new Map(
    employees.map((employee) => [Number(employee.id), createBucket()])
  );

  payroll.forEach((row) => {
    const bucket = buckets.get(Number(row.entity_id));
    if (!bucket) return;

    const salary = number(row.salary_amount);
    const transaction = {
      tx_date: row.tx_date,
      debit: salary,
      credit: text(row.payment_status) === "paid" ? salary : 0,
    };

    applyTransaction(bucket, transaction, fromDate, toDate);
  });

  return employees.map((employee) =>
    finalizeRow(
      {
        id: `employee-${employee.id}`,
        entity_id: Number(employee.id),
        name: text(employee.name) || `Employee #${employee.id}`,
        code: "",
        type: "employee",
        category: "Employee",
        unit: "PKR",
        is_quantity: false,
        detail_path: `/app/hr/ledger?employee_id=${employee.id}`,
        meta: text(employee.department),
      },
      buckets.get(Number(employee.id)) || createBucket()
    )
  );
}

async function loadGeneralAccounts(fromDate, toDate) {
  const accounts = await safeQuery(`
    SELECT
      coa.id,
      coa.account_code,
      coa.account_title,
      COALESCE(coa.opening_balance, 0) AS opening_balance,
      COALESCE(ag.group_name, '') AS group_name
    FROM chart_of_accounts coa
    LEFT JOIN account_groups ag ON ag.id = coa.group_id
    ORDER BY coa.account_title ASC
  `);

  const extraOpening = await safeQuery(`
    SELECT
      account_id AS entity_id,
      COALESCE(SUM(debit - credit), 0) AS movement
    FROM opening_balances
    GROUP BY account_id
  `);

  const vouchers = await safeQuery(`
    SELECT
      account_dr_id AS entity_id,
      voucher_date AS tx_date,
      COALESCE(amount, 0) AS debit,
      0 AS credit
    FROM journal_vouchers
    WHERE account_dr_id IS NOT NULL

    UNION ALL

    SELECT
      account_cr_id AS entity_id,
      voucher_date AS tx_date,
      0 AS debit,
      COALESCE(amount, 0) AS credit
    FROM journal_vouchers
    WHERE account_cr_id IS NOT NULL
  `);

  const extraOpeningMap = new Map(
    extraOpening.map((row) => [Number(row.entity_id), number(row.movement)])
  );

  const buckets = new Map(
    accounts.map((account) => [
      Number(account.id),
      createBucket({
        opening_balance:
          number(account.opening_balance) +
          number(extraOpeningMap.get(Number(account.id))),
      }),
    ])
  );

  vouchers.forEach((transaction) => {
    const bucket = buckets.get(Number(transaction.entity_id));
    if (bucket) applyTransaction(bucket, transaction, fromDate, toDate);
  });

  return accounts.map((account) =>
    finalizeRow(
      {
        id: `general-${account.id}`,
        entity_id: Number(account.id),
        name: text(account.account_title) || `Account #${account.id}`,
        code: text(account.account_code),
        type: "general",
        category: "General Account",
        unit: "PKR",
        is_quantity: false,
        detail_path: `/app/accounts/gl-report?account_id=${account.id}`,
        meta: text(account.group_name),
      },
      buckets.get(Number(account.id)) || createBucket()
    )
  );
}

async function loadProducts(fromDate, toDate) {
  const products = await safeQuery(`
    SELECT id, product_code, product_name
    FROM products
    ORDER BY product_name ASC
  `);

  const transactions = await safeQuery(`
    SELECT
      product_id AS entity_id,
      stock_date AS tx_date,
      COALESCE(quantity, 0) AS debit,
      0 AS credit
    FROM opening_stock

    UNION ALL

    SELECT
      product_id AS entity_id,
      receive_date AS tx_date,
      COALESCE(received_qty, 0) AS debit,
      0 AS credit
    FROM stock_receive

    UNION ALL

    SELECT
      product_id AS entity_id,
      date AS tx_date,
      0 AS debit,
      COALESCE(issued_qty, 0) AS credit
    FROM stock_issue
  `);

  const buckets = new Map(
    products.map((product) => [Number(product.id), createBucket()])
  );

  transactions.forEach((transaction) => {
    const bucket = buckets.get(Number(transaction.entity_id));
    if (bucket) applyTransaction(bucket, transaction, fromDate, toDate);
  });

  return products.map((product) =>
    finalizeRow(
      {
        id: `product-${product.id}`,
        entity_id: Number(product.id),
        name: text(product.product_name) || `Product #${product.id}`,
        code: text(product.product_code),
        type: "product",
        category: "Product",
        unit: "QTY",
        is_quantity: true,
        detail_path: `/app/inventory/product-ledger?product_id=${product.id}`,
        meta: "Stock quantity ledger",
      },
      buckets.get(Number(product.id)) || createBucket()
    )
  );
}

async function loadCashBook(fromDate, toDate) {
  const entries = await safeQuery(`
    SELECT
      entry_date AS tx_date,
      COALESCE(cash_in, 0) AS debit,
      COALESCE(cash_out, 0) AS credit
    FROM cash_book
    ORDER BY entry_date ASC, id ASC
  `);

  const bucket = createBucket();
  entries.forEach((transaction) =>
    applyTransaction(bucket, transaction, fromDate, toDate)
  );

  return [
    finalizeRow(
      {
        id: "cash-book",
        entity_id: 0,
        name: "Cash Book",
        code: "CASH",
        type: "cash",
        category: "Cash / Bank",
        unit: "PKR",
        is_quantity: false,
        detail_path: "/app/accounts/cashbook",
        meta: "Cash received and cash paid",
      },
      bucket
    ),
  ];
}

function buildSummary(rows) {
  const moneyRows = rows.filter((row) => !row.is_quantity);
  const productRows = rows.filter((row) => row.is_quantity);

  const totalDebit = moneyRows.reduce(
    (sum, row) => sum + number(row.total_debit),
    0
  );
  const totalCredit = moneyRows.reduce(
    (sum, row) => sum + number(row.total_credit),
    0
  );

  const totalReceivable = rows
    .filter((row) => row.type === "customer" && number(row.closing_balance) > 0)
    .reduce((sum, row) => sum + number(row.closing_balance), 0);

  const customerAdvances = rows
    .filter((row) => row.type === "customer" && number(row.closing_balance) < 0)
    .reduce((sum, row) => sum + Math.abs(number(row.closing_balance)), 0);

  const supplierPayable = rows
    .filter((row) => row.type === "supplier" && number(row.closing_balance) > 0)
    .reduce((sum, row) => sum + number(row.closing_balance), 0);

  const employeePayable = rows
    .filter((row) => row.type === "employee" && number(row.closing_balance) > 0)
    .reduce((sum, row) => sum + number(row.closing_balance), 0);

  const cashBalance = rows
    .filter((row) => row.type === "cash")
    .reduce((sum, row) => sum + number(row.closing_balance), 0);

  const stockQuantity = productRows.reduce(
    (sum, row) => sum + number(row.closing_balance),
    0
  );

  return {
    ledger_count: rows.length,
    money_ledger_count: moneyRows.length,
    product_ledger_count: productRows.length,
    total_receivable: totalReceivable,
    total_payable: supplierPayable + employeePayable + customerAdvances,
    total_debit: totalDebit,
    total_credit: totalCredit,
    net_balance: totalDebit - totalCredit,
    cash_balance: cashBalance,
    stock_quantity: stockQuantity,
  };
}

router.get("/", async (req, res) => {
  try {
    const fromDate = text(req.query.from_date);
    const toDate = text(req.query.to_date);
    const type = text(req.query.type).toLowerCase() || "all";
    const search = text(req.query.search).toLowerCase();

    if (fromDate && toDate && fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: "From date cannot be after To date.",
      });
    }

    const [customers, suppliers, employees, general, products, cash] =
      await Promise.all([
        loadCustomers(fromDate, toDate),
        loadSuppliers(fromDate, toDate),
        loadEmployees(fromDate, toDate),
        loadGeneralAccounts(fromDate, toDate),
        loadProducts(fromDate, toDate),
        loadCashBook(fromDate, toDate),
      ]);

    let rows = [
      ...customers,
      ...suppliers,
      ...employees,
      ...general,
      ...products,
      ...cash,
    ];

    if (type !== "all") {
      rows = rows.filter((row) => row.type === type);
    }

    if (search) {
      rows = rows.filter((row) =>
        [row.name, row.code, row.category, row.meta]
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    rows.sort((a, b) => {
      const typeCompare = a.category.localeCompare(b.category);
      if (typeCompare !== 0) return typeCompare;
      return a.name.localeCompare(b.name);
    });

    return res.json({
      success: true,
      message: "All ledger summary loaded successfully.",
      filters: {
        from_date: fromDate || null,
        to_date: toDate || null,
        type,
        search,
      },
      summary: buildSummary(rows),
      rows,
    });
  } catch (error) {
    console.error("GET /api/ledger-summary:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load ledger summary.",
    });
  }
});

module.exports = router;
