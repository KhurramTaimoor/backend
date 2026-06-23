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

const toNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toNullableNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const toDateOrNull = (value) => {
  if (!value) return null;
  return String(value).slice(0, 10);
};

const cleanText = (value) => String(value ?? "").trim();

const normalizePartyType = (value) => {
  const v = cleanText(value || "customer").toLowerCase();
  if (["customer", "employee", "supplier", "general_ledger"].includes(v)) return v;
  return "customer";
};

const normalizePaymentStatus = (paidAmount, grandTotal) => {
  const paid = toNum(paidAmount);
  const grand = toNum(grandTotal);
  if (paid <= 0) return "Unpaid";
  if (grand > 0 && paid >= grand) return "Paid";
  return "Partial";
};

const normalizePaymentMethod = (value) => {
  const v = cleanText(value || "Cash");
  const allowed = ["Cash", "Bank", "JazzCash", "EasyPaisa", "Cheque", "Other"];
  return allowed.includes(v) ? v : "Cash";
};

const normalizeItems = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      product_type_id: toNum(item.product_type_id),
      category_id: toNum(item.category_id),
      product_id: toNum(item.product_id),
      unit_id: toNum(item.unit_id),
      order_qty: toNum(item.order_qty ?? item.qty ?? item.quantity),
      rate: toNum(item.rate),
      debit: toNum(item.debit),
      credit: toNum(item.credit),
    }))
    .filter((item) => item.product_id > 0 && item.order_qty > 0);
};

const directBalanceKeys = [
  "previous_balance",
  "previousBalance",
  "prev_balance",
  "prevBalance",
  "opening_balance",
  "openingBalance",
  "balance",
  "current_balance",
  "currentBalance",
  "closing_balance",
  "closingBalance",
  "ledger_balance",
  "ledgerBalance",
  "account_balance",
  "accountBalance",
  "old_balance",
  "oldBalance",
  "remaining_balance",
  "remainingBalance",
  "due_balance",
  "dueBalance",
  "payable",
  "receivable",
];

const getRecordId = (row) =>
  row?.id ??
  row?.value ??
  row?.customer_id ??
  row?.employee_id ??
  row?.supplier_id ??
  row?.general_ledger_id ??
  row?.ledger_id ??
  row?.account_id ??
  "";

const getDirectPreviousBalance = (row) => {
  if (!row) return 0;

  for (const key of directBalanceKeys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return toNum(row[key]);
    }
  }

  const debit = toNum(row.debit || row.total_debit || row.debit_amount || row.dr || row.total_dr);
  const credit = toNum(row.credit || row.total_credit || row.credit_amount || row.cr || row.total_cr);
  if (debit || credit) return debit - credit;

  return 0;
};

const balanceMapKey = (partyType, partyId) => `${partyType}:${partyId}`;

function addToBalanceMap(map, partyType, partyId, amount) {
  const id = Number(partyId);
  if (!Number.isFinite(id) || id <= 0) return;
  const key = balanceMapKey(partyType, id);
  map[key] = toNum(map[key]) + toNum(amount);
}

async function getSaleOrderBalanceMap() {
  await ensureSaleOrderSchema();

  const map = {};
  const balanceExpr = `
    CASE
      WHEN remaining_balance IS NOT NULL THEN remaining_balance
      WHEN grand_total IS NOT NULL THEN (grand_total - IFNULL(paid_amount, 0))
      WHEN total_amount IS NOT NULL THEN (total_amount - IFNULL(paid_amount, 0))
      ELSE 0
    END
  `;

  const byParty = await runQuery(
    `SELECT party_type, party_id, SUM(${balanceExpr}) AS balance
     FROM sale_orders
     WHERE party_id IS NOT NULL AND party_id > 0
     GROUP BY party_type, party_id`
  ).catch(() => []);

  byParty.forEach((row) => {
    const type = normalizePartyType(row.party_type || "customer");
    addToBalanceMap(map, type, row.party_id, row.balance);
  });

  const legacyGroups = [
    { type: "customer", column: "customer_id" },
    { type: "employee", column: "employee_id" },
    { type: "supplier", column: "supplier_id" },
    { type: "general_ledger", column: "general_ledger_id" },
  ];

  for (const group of legacyGroups) {
    const rows = await runQuery(
      `SELECT ${group.column} AS id, SUM(${balanceExpr}) AS balance
       FROM sale_orders
       WHERE ${group.column} IS NOT NULL AND ${group.column} > 0
       GROUP BY ${group.column}`
    ).catch(() => []);

    rows.forEach((row) => addToBalanceMap(map, group.type, row.id, row.balance));
  }

  return map;
}

function attachPreviousBalance(list, partyType, balanceMap) {
  return (Array.isArray(list) ? list : []).map((row) => {
    const id = getRecordId(row);
    const directBalance = getDirectPreviousBalance(row);
    const saleOrderBalance = toNum(balanceMap[balanceMapKey(partyType, id)]);
    const previousBalance = directBalance !== 0 ? directBalance : saleOrderBalance;

    return {
      ...row,
      previous_balance: previousBalance,
      previousBalance,
      balance: previousBalance,
      current_balance: previousBalance,
      remaining_balance: previousBalance,
    };
  });
}

async function getPreviousBalanceForParty(partyType, partyId) {
  const type = normalizePartyType(partyType);
  const id = Number(partyId);
  if (!Number.isFinite(id) || id <= 0) return 0;

  const balanceMap = await getSaleOrderBalanceMap();
  return toNum(balanceMap[balanceMapKey(type, id)]);
}

async function columnExists(tableName, columnName) {
  const rows = await runQuery(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  return Number(rows?.[0]?.total || 0) > 0;
}

async function ensureColumn(tableName, columnName, definition) {
  const exists = await columnExists(tableName, columnName);
  if (exists) return;
  await runQuery(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definition}`);
}

let schemaReadyPromise = null;

function ensureSaleOrderSchema() {
  if (schemaReadyPromise) return schemaReadyPromise;

  schemaReadyPromise = (async () => {
    await ensureColumn("sale_orders", "reference_no", "`reference_no` VARCHAR(100) NULL AFTER `order_no`");
    await ensureColumn("sale_orders", "party_type", "`party_type` VARCHAR(50) NULL AFTER `reference_no`");
    await ensureColumn("sale_orders", "party_id", "`party_id` INT NULL AFTER `party_type`");
    await ensureColumn("sale_orders", "party_name", "`party_name` VARCHAR(255) NULL AFTER `party_id`");
    await ensureColumn("sale_orders", "customer_type", "`customer_type` VARCHAR(50) NULL AFTER `party_name`");
    await ensureColumn("sale_orders", "customer_id", "`customer_id` INT NULL AFTER `customer_name_en`");
    await ensureColumn("sale_orders", "employee_id", "`employee_id` INT NULL AFTER `customer_id`");
    await ensureColumn("sale_orders", "supplier_id", "`supplier_id` INT NULL AFTER `employee_id`");
    await ensureColumn("sale_orders", "general_ledger_id", "`general_ledger_id` INT NULL AFTER `supplier_id`");
    await ensureColumn("sale_orders", "shipment_to", "`shipment_to` VARCHAR(255) NULL AFTER `delivery_date`");
    await ensureColumn("sale_orders", "previous_balance", "`previous_balance` DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER `shipment_to`");
    await ensureColumn("sale_orders", "delivery_charges", "`delivery_charges` DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER `previous_balance`");
    await ensureColumn("sale_orders", "discount", "`discount` DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER `delivery_charges`");
    await ensureColumn("sale_orders", "grand_total", "`grand_total` DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER `total_amount`");
    await ensureColumn("sale_orders", "payment_method", "`payment_method` VARCHAR(50) NOT NULL DEFAULT 'Cash' AFTER `grand_total`");
    await ensureColumn("sale_orders", "paid_amount", "`paid_amount` DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER `payment_method`");
    await ensureColumn("sale_orders", "remaining_balance", "`remaining_balance` DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER `paid_amount`");
    await ensureColumn("sale_orders", "payment_status", "`payment_status` VARCHAR(30) NOT NULL DEFAULT 'Unpaid' AFTER `remaining_balance`");
    await ensureColumn("sale_orders", "payment_note", "`payment_note` VARCHAR(255) NULL AFTER `payment_status`");
  })();

  return schemaReadyPromise;
}

function buildOrderPayload(body) {
  const orderNo = cleanText(body.order_no);
  const partyType = normalizePartyType(body.party_type || body.customer_type);
  const partyId = toNullableNum(body.party_id);

  const partyName = cleanText(
    body.party_name ||
      body.customer_name_en ||
      body.customer_name ||
      body.name ||
      ""
  );

  const totalAmount = toNum(body.total_amount);
  const previousBalance = toNum(body.previous_balance);
  const deliveryCharges = toNum(body.delivery_charges);
  const discount = toNum(body.discount);

  const grandTotal = toNum(
    body.grand_total,
    totalAmount + previousBalance + deliveryCharges - discount
  );

  const paidAmount = toNum(body.paid_amount);

  const remainingBalance = Math.max(
    0,
    toNum(body.remaining_balance, grandTotal - paidAmount)
  );

  const paymentStatus =
    cleanText(body.payment_status) ||
    normalizePaymentStatus(paidAmount, grandTotal);

  return {
    order_no: orderNo,
    reference_no: cleanText(body.reference_no),
    party_type: partyType,
    party_id: partyId,
    party_name: partyName,

    customer_type: partyType,
    customer_name_en: partyName,

    customer_id: partyType === "customer" ? toNullableNum(body.customer_id || partyId) : null,
    employee_id: partyType === "employee" ? toNullableNum(body.employee_id || partyId) : null,
    supplier_id: partyType === "supplier" ? toNullableNum(body.supplier_id || partyId) : null,
    general_ledger_id: partyType === "general_ledger" ? toNullableNum(body.general_ledger_id || partyId) : null,

    order_date: toDateOrNull(body.order_date),
    delivery_date: toDateOrNull(body.delivery_date),
    shipment_to: cleanText(body.shipment_to),

    previous_balance: previousBalance,
    delivery_charges: deliveryCharges,
    discount,
    total_amount: totalAmount,
    grand_total: grandTotal,

    payment_method: normalizePaymentMethod(body.payment_method),
    paid_amount: paidAmount,
    remaining_balance: remainingBalance,
    payment_status: paymentStatus,
    payment_note: cleanText(body.payment_note),

    status: cleanText(body.status || "Pending") || "Pending",
  };
}

async function getDropdownData() {
  const [
    categories,
    units,
    products,
    productTypes,
    customers,
    employees,
    suppliers,
    generalLedgers,
    balanceMap,
  ] = await Promise.all([
    runQuery(`SELECT * FROM categories ORDER BY id DESC`).catch(() => []),
    runQuery(`SELECT * FROM units ORDER BY id DESC`).catch(() => []),
    runQuery(`SELECT * FROM products ORDER BY id DESC`).catch(() => []),
    runQuery(`SELECT * FROM product_types ORDER BY id DESC`).catch(() => []),
    runQuery(`SELECT * FROM customers ORDER BY id DESC`).catch(() => []),
    runQuery(`SELECT * FROM employees ORDER BY id DESC`).catch(() => []),
    runQuery(`SELECT * FROM suppliers ORDER BY id DESC`).catch(() => []),
    runQuery(`SELECT * FROM general_ledgers ORDER BY id DESC`).catch(() => []),
    getSaleOrderBalanceMap().catch(() => ({})),
  ]);

  return {
    categories,
    units,
    products,
    product_types: productTypes,
    customers: attachPreviousBalance(customers, "customer", balanceMap),
    employees: attachPreviousBalance(employees, "employee", balanceMap),
    suppliers: attachPreviousBalance(suppliers, "supplier", balanceMap),
    general_ledgers: attachPreviousBalance(generalLedgers, "general_ledger", balanceMap),
  };
}

async function getOrderById(id) {
  await ensureSaleOrderSchema();

  const [orders, items] = await Promise.all([
    runQuery(
      `SELECT
          id,
          order_no,
          reference_no,
          party_type,
          party_id,
          party_name,
          customer_type,
          customer_name_en,
          customer_id,
          employee_id,
          supplier_id,
          general_ledger_id,
          DATE_FORMAT(order_date, '%Y-%m-%d') AS order_date,
          DATE_FORMAT(delivery_date, '%Y-%m-%d') AS delivery_date,
          shipment_to,
          previous_balance,
          delivery_charges,
          discount,
          total_amount,
          grand_total,
          payment_method,
          paid_amount,
          remaining_balance,
          payment_status,
          payment_note,
          status
       FROM sale_orders
       WHERE id = ?`,
      [id]
    ),
    runQuery(
      `SELECT
          id,
          order_id,
          product_type_id,
          category_id,
          product_id,
          unit_id,
          order_qty,
          rate,
          debit,
          credit
       FROM sale_order_items
       WHERE order_id = ?
       ORDER BY id ASC`,
      [id]
    ),
  ]);

  if (!orders[0]) return null;

  return {
    ...orders[0],
    customer_name: orders[0].party_name || orders[0].customer_name_en || "",
    order_items: items,
  };
}

async function insertOrderItems(orderId, validItems) {
  await Promise.all(
    validItems.map((item) =>
      runQuery(
        `INSERT INTO sale_order_items
         (order_id, product_type_id, category_id, product_id, unit_id, order_qty, rate, debit, credit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.product_type_id,
          item.category_id,
          item.product_id,
          item.unit_id,
          item.order_qty,
          item.rate,
          item.debit,
          item.credit,
        ]
      )
    )
  );
}

// GET /api/sale-orders
router.get("/", async (req, res) => {
  try {
    await ensureSaleOrderSchema();

    const dropdowns = await getDropdownData();

    const orders = await runQuery(
      `SELECT
          id,
          order_no,
          reference_no,
          party_type,
          party_id,
          party_name,
          customer_type,
          customer_name_en,
          customer_id,
          employee_id,
          supplier_id,
          general_ledger_id,
          DATE_FORMAT(order_date, '%Y-%m-%d') AS order_date,
          DATE_FORMAT(delivery_date, '%Y-%m-%d') AS delivery_date,
          shipment_to,
          previous_balance,
          delivery_charges,
          discount,
          total_amount,
          grand_total,
          payment_method,
          paid_amount,
          remaining_balance,
          payment_status,
          payment_note,
          status
       FROM sale_orders
       ORDER BY id DESC`
    );

    if (!orders.length) {
      return res.json({
        success: true,
        data: [],
        orders: [],
        dropdowns,
      });
    }

    const orderIds = orders.map((o) => o.id);

    const allItems = await runQuery(
      `SELECT
          id,
          order_id,
          product_type_id,
          category_id,
          product_id,
          unit_id,
          order_qty,
          rate,
          debit,
          credit
       FROM sale_order_items
       WHERE order_id IN (?)
       ORDER BY order_id ASC, id ASC`,
      [orderIds]
    );

    const itemsMap = {};
    allItems.forEach((item) => {
      if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
      itemsMap[item.order_id].push(item);
    });

    const result = orders.map((o) => ({
      ...o,
      customer_name: o.party_name || o.customer_name_en || "",
      order_items: itemsMap[o.id] || [],
    }));

    res.json({
      success: true,
      data: result,
      orders: result,
      dropdowns,
    });
  } catch (err) {
    console.error("❌ GET /sale-orders:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/sale-orders/previous-balance/:partyType/:partyId
router.get("/previous-balance/:partyType/:partyId", async (req, res) => {
  try {
    const partyType = normalizePartyType(req.params.partyType);
    const partyId = Number(req.params.partyId);

    if (!partyId || partyId <= 0) {
      return res.status(400).json({ message: "Valid party id zaroori hai." });
    }

    const previousBalance = await getPreviousBalanceForParty(partyType, partyId);

    res.json({
      success: true,
      party_type: partyType,
      party_id: partyId,
      previous_balance: previousBalance,
      previousBalance,
      balance: previousBalance,
    });
  } catch (err) {
    console.error("❌ GET /sale-orders/previous-balance:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/sale-orders/:id
router.get("/:id", async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Sale order nahi mila." });
    }
    res.json(order);
  } catch (err) {
    console.error(`❌ GET /sale-orders/${req.params.id}:`, err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sale-orders
router.post("/", async (req, res) => {
  try {
    await ensureSaleOrderSchema();

    const payload = buildOrderPayload(req.body);
    const validItems = normalizeItems(req.body.order_items);

    if (!payload.order_no) {
      return res.status(400).json({ message: "Order No zaroori hai." });
    }

    if (!payload.party_type || !payload.party_id || !payload.party_name) {
      return res.status(400).json({
        message: "Customer Type aur Name zaroori hain.",
      });
    }

    if (!validItems.length) {
      return res.status(400).json({
        message: "Kam az kam ek product zaroori hai.",
      });
    }

    const orderResult = await runQuery(
      `INSERT INTO sale_orders
       (
         order_no,
         reference_no,
         party_type,
         party_id,
         party_name,
         customer_type,
         customer_name_en,
         customer_id,
         employee_id,
         supplier_id,
         general_ledger_id,
         order_date,
         delivery_date,
         shipment_to,
         previous_balance,
         delivery_charges,
         discount,
         total_amount,
         grand_total,
         payment_method,
         paid_amount,
         remaining_balance,
         payment_status,
         payment_note,
         status
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.order_no,
        payload.reference_no,
        payload.party_type,
        payload.party_id,
        payload.party_name,
        payload.customer_type,
        payload.customer_name_en,
        payload.customer_id,
        payload.employee_id,
        payload.supplier_id,
        payload.general_ledger_id,
        payload.order_date,
        payload.delivery_date,
        payload.shipment_to,
        payload.previous_balance,
        payload.delivery_charges,
        payload.discount,
        payload.total_amount,
        payload.grand_total,
        payload.payment_method,
        payload.paid_amount,
        payload.remaining_balance,
        payload.payment_status,
        payload.payment_note,
        payload.status,
      ]
    );

    const orderId = orderResult.insertId;

    await insertOrderItems(orderId, validItems);

    const order = await getOrderById(orderId);

    res.json({
      message: "Sale order save ho gaya!",
      data: order,
    });
  } catch (err) {
    console.error("❌ POST /sale-orders:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/sale-orders/:id
router.put("/:id", async (req, res) => {
  try {
    await ensureSaleOrderSchema();

    const payload = buildOrderPayload(req.body);
    const validItems = normalizeItems(req.body.order_items);

    if (!payload.order_no) {
      return res.status(400).json({ message: "Order No zaroori hai." });
    }

    if (!payload.party_type || !payload.party_id || !payload.party_name) {
      return res.status(400).json({
        message: "Customer Type aur Name zaroori hain.",
      });
    }

    if (!validItems.length) {
      return res.status(400).json({
        message: "Kam az kam ek product zaroori hai.",
      });
    }

    await runQuery(
      `UPDATE sale_orders
       SET
         order_no = ?,
         reference_no = ?,
         party_type = ?,
         party_id = ?,
         party_name = ?,
         customer_type = ?,
         customer_name_en = ?,
         customer_id = ?,
         employee_id = ?,
         supplier_id = ?,
         general_ledger_id = ?,
         order_date = ?,
         delivery_date = ?,
         shipment_to = ?,
         previous_balance = ?,
         delivery_charges = ?,
         discount = ?,
         total_amount = ?,
         grand_total = ?,
         payment_method = ?,
         paid_amount = ?,
         remaining_balance = ?,
         payment_status = ?,
         payment_note = ?,
         status = ?
       WHERE id = ?`,
      [
        payload.order_no,
        payload.reference_no,
        payload.party_type,
        payload.party_id,
        payload.party_name,
        payload.customer_type,
        payload.customer_name_en,
        payload.customer_id,
        payload.employee_id,
        payload.supplier_id,
        payload.general_ledger_id,
        payload.order_date,
        payload.delivery_date,
        payload.shipment_to,
        payload.previous_balance,
        payload.delivery_charges,
        payload.discount,
        payload.total_amount,
        payload.grand_total,
        payload.payment_method,
        payload.paid_amount,
        payload.remaining_balance,
        payload.payment_status,
        payload.payment_note,
        payload.status,
        req.params.id,
      ]
    );

    await runQuery(`DELETE FROM sale_order_items WHERE order_id = ?`, [
      req.params.id,
    ]);

    await insertOrderItems(req.params.id, validItems);

    const order = await getOrderById(req.params.id);

    res.json({
      message: "Sale order update ho gaya!",
      data: order,
    });
  } catch (err) {
    console.error(`❌ PUT /sale-orders/${req.params.id}:`, err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/sale-orders/:id
router.delete("/:id", async (req, res) => {
  try {
    await runQuery(`DELETE FROM sale_order_items WHERE order_id = ?`, [
      req.params.id,
    ]);

    await runQuery(`DELETE FROM sale_orders WHERE id = ?`, [req.params.id]);

    res.json({ message: "Deleted!" });
  } catch (err) {
    console.error(`❌ DELETE /sale-orders/${req.params.id}:`, err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
