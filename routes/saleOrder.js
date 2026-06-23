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

const cleanText = (value) => String(value ?? "").trim();

const toDateOrNull = (value) => {
  if (!value) return null;
  return String(value).slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
};

const normalizePartyType = (value) => {
  const v = cleanText(value || "customer").toLowerCase();
  if (["customer", "employee", "supplier", "general_ledger"].includes(v)) return v;
  return "customer";
};

const normalizePaymentMethod = (value) => {
  const v = cleanText(value || "Cash");
  const allowed = ["Cash", "Bank", "JazzCash", "EasyPaisa", "Cheque", "Other"];
  return allowed.includes(v) ? v : "Cash";
};

const normalizePaymentStatus = (paidAmount, grandTotal) => {
  const paid = toNum(paidAmount);
  const grand = toNum(grandTotal);
  if (paid <= 0) return "Unpaid";
  if (grand > 0 && paid >= grand) return "Paid";
  return "Partial";
};

const firstText = (row, keys, fallback = "") => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && String(row[key]).trim()) {
      return String(row[key]).trim();
    }
  }
  return fallback;
};

const getRowId = (row) =>
  row?.id ??
  row?.value ??
  row?.customer_id ??
  row?.employee_id ??
  row?.supplier_id ??
  row?.general_ledger_id ??
  row?.ledger_id ??
  row?.account_id ??
  "";

const getCustomerName = (row) => firstText(row, ["customer_name_en", "customer_name", "name", "name_en", "title"]);
const getEmployeeName = (row) => firstText(row, ["employee_name", "employee_name_en", "full_name", "name", "name_en", "title"]);
const getSupplierName = (row) => firstText(row, ["supplier_name", "supplier_name_en", "vendor_name", "name", "name_en", "title"]);
const getLedgerName = (row) => firstText(row, ["ledger_name", "account_title", "account_name", "name", "name_en", "title"]);

let columnsCache = {};

async function getColumns(tableName) {
  if (columnsCache[tableName]) return columnsCache[tableName];

  const rows = await runQuery(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName]
  );

  columnsCache[tableName] = rows.map((row) => row.COLUMN_NAME);
  return columnsCache[tableName];
}

function filterPayloadByColumns(payload, columns) {
  const filtered = {};
  for (const key of Object.keys(payload)) {
    if (columns.includes(key) && payload[key] !== undefined) filtered[key] = payload[key];
  }
  return filtered;
}

async function insertRow(tableName, payload) {
  const columns = await getColumns(tableName);
  const data = filterPayloadByColumns(payload, columns);
  const keys = Object.keys(data);

  if (!keys.length) throw new Error(`${tableName} insert columns missing.`);

  const sql = `INSERT INTO \`${tableName}\` (${keys.map((k) => `\`${k}\``).join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;
  const result = await runQuery(sql, keys.map((key) => data[key]));
  return result;
}

async function updateRow(tableName, id, payload) {
  const columns = await getColumns(tableName);
  const data = filterPayloadByColumns(payload, columns);
  delete data.id;

  const keys = Object.keys(data);
  if (!keys.length) return;

  const sql = `UPDATE \`${tableName}\` SET ${keys.map((k) => `\`${k}\` = ?`).join(", ")} WHERE id = ?`;
  await runQuery(sql, [...keys.map((key) => data[key]), id]);
}

function normalizeItems(items = []) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      product_type_id: toNum(item.product_type_id),
      category_id: toNum(item.category_id),
      product_id: toNum(item.product_id),
      product_description: cleanText(item.product_description || item.description || item.product_desc || item.desc || ""),
      unit_id: toNum(item.unit_id),
      order_qty: toNum(item.order_qty ?? item.qty ?? item.quantity),
      rate_mode: cleanText(item.rate_mode || item.rateMode || "auto") || "auto",
      rate: toNum(item.rate),
      debit: toNum(item.debit),
      credit: toNum(item.credit),
    }))
    .filter((item) => item.product_id > 0 && item.order_qty > 0);
}

function getOrderPartyType(order) {
  return normalizePartyType(order.party_type || order.customer_type || (order.customer_id ? "customer" : "customer"));
}

function getOrderPartyId(order) {
  const type = getOrderPartyType(order);
  if (order.party_id) return String(order.party_id);
  if (type === "employee") return String(order.employee_id || "");
  if (type === "supplier") return String(order.supplier_id || "");
  if (type === "general_ledger") return String(order.general_ledger_id || order.ledger_id || order.account_id || "");
  return String(order.customer_id || "");
}

function getOrderPartyName(order) {
  return cleanText(order.party_name || order.customer_name_en || order.customer_name || order.name || "");
}

function buildOrderPayload(body) {
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
  const grandTotal = toNum(body.grand_total, totalAmount + previousBalance + deliveryCharges - discount);

  const advanceReceive = toNum(body.advance_receive ?? body.advanceReceive ?? body.paid_amount ?? 0);
  const paymentReceived = toNum(body.payment_received ?? body.paymentReceived ?? body.paid_amount ?? advanceReceive);
  const paidAmount = paymentReceived || advanceReceive || toNum(body.paid_amount);
  const remainingBalance = Math.max(0, toNum(body.remaining_balance, grandTotal - paidAmount));
  const paymentStatus = cleanText(body.payment_status) || normalizePaymentStatus(paidAmount, grandTotal);

  return {
    order_no: cleanText(body.order_no),
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
    advance_receive: advanceReceive,
    payment_received: paymentReceived,
    paid_amount: paidAmount,
    remaining_balance: remainingBalance,
    payment_status: paymentStatus,
    payment_note: cleanText(body.payment_note),

    status: cleanText(body.status || "Pending") || "Pending",
  };
}

function balanceKey(partyType, partyId) {
  return `${normalizePartyType(partyType)}:${partyId}`;
}

function addBalance(map, partyType, partyId, value) {
  const id = Number(partyId);
  if (!Number.isFinite(id) || id <= 0) return;
  const key = balanceKey(partyType, id);
  map[key] = toNum(map[key]) + toNum(value);
}

async function getSaleOrderBalanceMap() {
  const orders = await runQuery(`SELECT * FROM sale_orders`).catch(() => []);
  const map = {};

  for (const order of orders) {
    const balance =
      order.remaining_balance !== undefined && order.remaining_balance !== null
        ? toNum(order.remaining_balance)
        : order.grand_total !== undefined && order.grand_total !== null
          ? toNum(order.grand_total) - toNum(order.paid_amount)
          : toNum(order.total_amount) - toNum(order.paid_amount);

    const partyType = getOrderPartyType(order);
    const partyId = getOrderPartyId(order);
    addBalance(map, partyType, partyId, balance);

    if (order.customer_id) addBalance(map, "customer", order.customer_id, balance);
    if (order.employee_id) addBalance(map, "employee", order.employee_id, balance);
    if (order.supplier_id) addBalance(map, "supplier", order.supplier_id, balance);
    if (order.general_ledger_id) addBalance(map, "general_ledger", order.general_ledger_id, balance);
  }

  return map;
}

function directPreviousBalance(row) {
  const keys = [
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

  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return toNum(row[key]);
    }
  }

  const debit = toNum(row.debit || row.total_debit || row.debit_amount || row.dr || row.total_dr);
  const credit = toNum(row.credit || row.total_credit || row.credit_amount || row.cr || row.total_cr);
  if (debit || credit) return debit - credit;

  return 0;
}

function attachPreviousBalance(list, partyType, balanceMap, nameGetter) {
  return (Array.isArray(list) ? list : []).map((row) => {
    const id = getRowId(row);
    const direct = directPreviousBalance(row);
    const saleOrderBalance = toNum(balanceMap[balanceKey(partyType, id)]);
    const previousBalance = direct !== 0 ? direct : saleOrderBalance;

    return {
      ...row,
      display_name: nameGetter ? nameGetter(row) : undefined,
      previous_balance: previousBalance,
      previousBalance,
      balance: previousBalance,
      current_balance: previousBalance,
      remaining_balance: previousBalance,
    };
  });
}

async function getDropdownData() {
  const balanceMap = await getSaleOrderBalanceMap().catch(() => ({}));

  const [categories, units, products, productTypes, customers, employees, suppliers, generalLedgers] = await Promise.all([
    runQuery(`SELECT * FROM categories ORDER BY id DESC`).catch(() => []),
    runQuery(`SELECT * FROM units ORDER BY id DESC`).catch(() => []),
    runQuery(`SELECT * FROM products ORDER BY id DESC`).catch(() => []),
    runQuery(`SELECT * FROM product_types ORDER BY id DESC`).catch(() => []),
    runQuery(`SELECT * FROM customers ORDER BY id DESC`).catch(() => []),
    runQuery(`SELECT * FROM employees ORDER BY id DESC`).catch(() => []),
    runQuery(`SELECT * FROM suppliers ORDER BY id DESC`).catch(() => []),
    runQuery(`SELECT * FROM general_ledgers ORDER BY id DESC`).catch(() => []),
  ]);

  return {
    categories,
    units,
    products,
    product_types: productTypes,
    types: productTypes,
    customers: attachPreviousBalance(customers, "customer", balanceMap, getCustomerName),
    employees: attachPreviousBalance(employees, "employee", balanceMap, getEmployeeName),
    suppliers: attachPreviousBalance(suppliers, "supplier", balanceMap, getSupplierName),
    general_ledgers: attachPreviousBalance(generalLedgers, "general_ledger", balanceMap, getLedgerName),
    generalLedgers: attachPreviousBalance(generalLedgers, "general_ledger", balanceMap, getLedgerName),
  };
}

async function getOrderById(id) {
  const orders = await runQuery(`SELECT * FROM sale_orders WHERE id = ?`, [id]);
  if (!orders[0]) return null;

  const items = await runQuery(`SELECT * FROM sale_order_items WHERE order_id = ? ORDER BY id ASC`, [id]).catch(() => []);

  return {
    ...orders[0],
    order_date: formatDate(orders[0].order_date),
    delivery_date: formatDate(orders[0].delivery_date),
    customer_name: getOrderPartyName(orders[0]),
    order_items: items,
  };
}

async function insertOrderItems(orderId, items) {
  const itemColumns = await getColumns("sale_order_items");

  for (const item of items) {
    const payload = filterPayloadByColumns(
      {
        order_id: orderId,
        product_type_id: item.product_type_id,
        category_id: item.category_id,
        product_id: item.product_id,
        product_description: item.product_description,
        unit_id: item.unit_id,
        order_qty: item.order_qty,
        rate_mode: item.rate_mode,
        rate: item.rate,
        debit: item.debit,
        credit: item.credit,
      },
      itemColumns
    );

    const keys = Object.keys(payload);
    if (!keys.length) continue;

    const sql = `INSERT INTO sale_order_items (${keys.map((k) => `\`${k}\``).join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;
    await runQuery(sql, keys.map((key) => payload[key]));
  }
}

// GET /api/sale-orders
router.get("/", async (req, res) => {
  try {
    const dropdowns = await getDropdownData();
    const orders = await runQuery(`SELECT * FROM sale_orders ORDER BY id DESC`).catch(() => []);

    if (!orders.length) {
      return res.json({ success: true, data: [], orders: [], dropdowns });
    }

    const orderIds = orders.map((order) => order.id).filter(Boolean);
    const allItems = orderIds.length
      ? await runQuery(`SELECT * FROM sale_order_items WHERE order_id IN (?) ORDER BY order_id ASC, id ASC`, [orderIds]).catch(() => [])
      : [];

    const itemsMap = {};
    for (const item of allItems) {
      if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
      itemsMap[item.order_id].push(item);
    }

    const result = orders.map((order) => ({
      ...order,
      order_date: formatDate(order.order_date),
      delivery_date: formatDate(order.delivery_date),
      customer_name: getOrderPartyName(order),
      order_items: itemsMap[order.id] || [],
    }));

    res.json({ success: true, data: result, orders: result, dropdowns });
  } catch (err) {
    console.error("❌ GET /sale-orders:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to load sale orders." });
  }
});

// GET /api/sale-orders/previous-balance/:partyType/:partyId
router.get("/previous-balance/:partyType/:partyId", async (req, res) => {
  try {
    const partyType = normalizePartyType(req.params.partyType);
    const partyId = Number(req.params.partyId);

    if (!partyId || partyId <= 0) {
      return res.status(400).json({ success: false, message: "Valid party id zaroori hai." });
    }

    const balanceMap = await getSaleOrderBalanceMap();
    const previousBalance = toNum(balanceMap[balanceKey(partyType, partyId)]);

    res.json({
      success: true,
      party_type: partyType,
      party_id: partyId,
      previous_balance: previousBalance,
      previousBalance,
      balance: previousBalance,
    });
  } catch (err) {
    console.error("❌ GET /sale-orders/previous-balance:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to load previous balance." });
  }
});

// GET /api/sale-orders/:id
router.get("/:id", async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Sale order nahi mila." });
    res.json({ success: true, data: order, order });
  } catch (err) {
    console.error(`❌ GET /sale-orders/${req.params.id}:`, err);
    res.status(500).json({ success: false, message: err.message || "Failed to load sale order." });
  }
});

// POST /api/sale-orders
router.post("/", async (req, res) => {
  try {
    const payload = buildOrderPayload(req.body);
    const validItems = normalizeItems(req.body.order_items);

    if (!payload.order_no) return res.status(400).json({ success: false, message: "Order No zaroori hai." });
    if (!payload.party_type || !payload.party_id || !payload.party_name) {
      return res.status(400).json({ success: false, message: "Customer Type aur Name zaroori hain." });
    }
    if (!validItems.length) {
      return res.status(400).json({ success: false, message: "Kam az kam ek product zaroori hai." });
    }

    const result = await insertRow("sale_orders", payload);
    const orderId = result.insertId;

    await insertOrderItems(orderId, validItems);

    const order = await getOrderById(orderId);
    res.json({ success: true, message: "Sale order save ho gaya!", data: order, order });
  } catch (err) {
    console.error("❌ POST /sale-orders:", err);
    res.status(500).json({ success: false, message: err.message || "Sale order save failed." });
  }
});

// PUT /api/sale-orders/:id
router.put("/:id", async (req, res) => {
  try {
    const payload = buildOrderPayload(req.body);
    const validItems = normalizeItems(req.body.order_items);

    if (!payload.order_no) return res.status(400).json({ success: false, message: "Order No zaroori hai." });
    if (!payload.party_type || !payload.party_id || !payload.party_name) {
      return res.status(400).json({ success: false, message: "Customer Type aur Name zaroori hain." });
    }
    if (!validItems.length) {
      return res.status(400).json({ success: false, message: "Kam az kam ek product zaroori hai." });
    }

    await updateRow("sale_orders", req.params.id, payload);
    await runQuery(`DELETE FROM sale_order_items WHERE order_id = ?`, [req.params.id]);
    await insertOrderItems(req.params.id, validItems);

    const order = await getOrderById(req.params.id);
    res.json({ success: true, message: "Sale order update ho gaya!", data: order, order });
  } catch (err) {
    console.error(`❌ PUT /sale-orders/${req.params.id}:`, err);
    res.status(500).json({ success: false, message: err.message || "Sale order update failed." });
  }
});

// DELETE /api/sale-orders/:id
router.delete("/:id", async (req, res) => {
  try {
    await runQuery(`DELETE FROM sale_order_items WHERE order_id = ?`, [req.params.id]).catch(() => {});
    await runQuery(`DELETE FROM sale_orders WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: "Deleted!" });
  } catch (err) {
    console.error(`❌ DELETE /sale-orders/${req.params.id}:`, err);
    res.status(500).json({ success: false, message: err.message || "Sale order delete failed." });
  }
});

module.exports = router;
