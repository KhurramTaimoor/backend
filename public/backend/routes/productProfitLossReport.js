const express = require("express");
const router = express.Router();
const db = require("../db");

const queryAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

const toNumber = (value) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (value) => Number(toNumber(value).toFixed(2));
const clean = (value) => String(value ?? "").trim();
const normalizeName = (value) => clean(value).toLowerCase();

const prefer = (...values) => {
  for (const value of values) {
    const v = clean(value);
    if (v) return v;
  }
  return "";
};

const makeKey = ({ product_id, product_name }) => {
  if (product_id) return `id:${product_id}`;
  return `name:${normalizeName(product_name) || "unknown"}`;
};

async function tableExists(tableName) {
  const rows = await queryAsync(
    `
    SELECT COUNT(*) AS total
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
    `,
    [tableName]
  );

  return Number(rows?.[0]?.total || 0) > 0;
}

async function getColumns(tableName) {
  const rows = await queryAsync(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
    `,
    [tableName]
  );

  return new Set(rows.map((row) => row.COLUMN_NAME));
}

async function loadProductMap() {
  const map = {};

  if (!(await tableExists("products"))) return map;

  const cols = await getColumns("products");
  const nameCol = cols.has("product_name") ? "product_name" : cols.has("name") ? "name" : "id";

  const rows = await queryAsync(`SELECT id, ${nameCol} AS product_name FROM products`);

  rows.forEach((row) => {
    map[String(row.id)] = clean(row.product_name);
  });

  return map;
}

function ensureProduct(bucket, row, productMap = {}) {
  const productId = row.product_id || "";
  const productName = prefer(row.product_name, productId ? productMap[String(productId)] : "");

  if (!productId && !productName) return null;

  const key = makeKey({ product_id: productId, product_name: productName });

  if (!bucket[key]) {
    bucket[key] = {
      product_id: productId,
      product_name: productName || "—",
      category_name: prefer(row.category_name, row.category) || "—",
      type_name: prefer(row.type_name, row.product_type_name, row.product_type) || "—",
      unit_name: prefer(row.unit_name, row.unit) || "—",

      sold_qty: 0,
      sales_amount: 0,

      purchase_qty: 0,
      purchase_amount: 0,

      purchase_return_qty: 0,
      purchase_return_amount: 0,

      fallback_rate_total: 0,
      fallback_rate_count: 0,
    };
  }

  const record = bucket[key];

  if ((!record.product_name || record.product_name === "—") && productName) record.product_name = productName;
  if ((!record.category_name || record.category_name === "—") && (row.category_name || row.category)) {
    record.category_name = prefer(row.category_name, row.category);
  }
  if ((!record.type_name || record.type_name === "—") && (row.type_name || row.product_type_name || row.product_type)) {
    record.type_name = prefer(row.type_name, row.product_type_name, row.product_type);
  }
  if ((!record.unit_name || record.unit_name === "—") && (row.unit_name || row.unit)) {
    record.unit_name = prefer(row.unit_name, row.unit);
  }

  return record;
}

async function applySalesInvoices(bucket, productMap) {
  if (!(await tableExists("sales_invoice_items"))) return;

  const rows = await queryAsync(
    `
    SELECT
      product_id,
      product_name,
      category_name,
      unit_name,
      qty,
      pieces_qty,
      amount
    FROM sales_invoice_items
    `
  );

  rows.forEach((row) => {
    const record = ensureProduct(bucket, row, productMap);
    if (!record) return;

    record.sold_qty += toNumber(row.pieces_qty || row.qty);
    record.sales_amount += toNumber(row.amount);
  });
}

async function applySalesReturns(bucket, productMap) {
  if (!(await tableExists("sales_returns"))) return;

  const rows = await queryAsync(
    `
    SELECT
      product_id,
      product_name,
      return_qty,
      return_amount
    FROM sales_returns
    `
  );

  rows.forEach((row) => {
    const record = ensureProduct(bucket, row, productMap);
    if (!record) return;

    record.sold_qty -= toNumber(row.return_qty);
    record.sales_amount -= toNumber(row.return_amount);
  });
}

async function applyPurchaseInvoices(bucket, productMap) {
  if (!(await tableExists("purchase_invoice_items"))) return;

  const rows = await queryAsync(
    `
    SELECT
      product_id,
      product_name,
      category_name,
      type_name,
      unit_name,
      quantity,
      rate,
      amount
    FROM purchase_invoice_items
    `
  );

  rows.forEach((row) => {
    const record = ensureProduct(bucket, row, productMap);
    if (!record) return;

    const qty = toNumber(row.quantity);
    const amount = toNumber(row.amount || qty * toNumber(row.rate));

    record.purchase_qty += qty;
    record.purchase_amount += amount;
  });
}

async function applyPurchaseReturns(bucket, productMap) {
  if (!(await tableExists("purchase_return_items"))) return;

  const rows = await queryAsync(
    `
    SELECT
      product_id,
      product_name,
      category_name,
      type_name,
      unit_name,
      quantity,
      rate,
      amount
    FROM purchase_return_items
    `
  );

  rows.forEach((row) => {
    const record = ensureProduct(bucket, row, productMap);
    if (!record) return;

    const qty = toNumber(row.quantity);
    const amount = toNumber(row.amount || qty * toNumber(row.rate));

    record.purchase_return_qty += qty;
    record.purchase_return_amount += amount;
  });
}

async function applyPurchaseRates(bucket, productMap) {
  if (!(await tableExists("purchase_rates"))) return;

  const rows = await queryAsync(
    `
    SELECT
      product_name,
      category_name,
      type_name,
      unit_name,
      rate
    FROM purchase_rates
    WHERE rate IS NOT NULL
    `
  );

  rows.forEach((row) => {
    const record = ensureProduct(bucket, row, productMap);
    if (!record) return;

    const rate = toNumber(row.rate);
    if (rate > 0) {
      record.fallback_rate_total += rate;
      record.fallback_rate_count += 1;
    }
  });
}

// GET /api/reports/product-profit-loss
router.get("/", async (req, res) => {
  try {
    const productMap = await loadProductMap();
    const bucket = {};

    await applySalesInvoices(bucket, productMap);
    await applySalesReturns(bucket, productMap);
    await applyPurchaseInvoices(bucket, productMap);
    await applyPurchaseReturns(bucket, productMap);
    await applyPurchaseRates(bucket, productMap);

    const rows = Object.values(bucket)
      .map((row, index) => {
        const soldQty = Math.max(0, toNumber(row.sold_qty));
        const salesAmount = Math.max(0, toNumber(row.sales_amount));

        const netPurchaseQty = Math.max(0, toNumber(row.purchase_qty) - toNumber(row.purchase_return_qty));
        const netPurchaseAmount = Math.max(
          0,
          toNumber(row.purchase_amount) - toNumber(row.purchase_return_amount)
        );

        const averagePurchaseRate =
          netPurchaseQty > 0
            ? netPurchaseAmount / netPurchaseQty
            : row.fallback_rate_count > 0
            ? row.fallback_rate_total / row.fallback_rate_count
            : 0;

        const purchaseCost = round2(soldQty * averagePurchaseRate);
        const profitLoss = round2(salesAmount - purchaseCost);
        const margin = salesAmount > 0 ? round2((profitLoss / salesAmount) * 100) : 0;

        return {
          id: index + 1,
          product_id: row.product_id || "",
          product_name: row.product_name || "—",
          category_name: row.category_name || "—",
          type_name: row.type_name || "—",
          unit_name: row.unit_name || "—",
          sold_qty: round2(soldQty),
          sales_amount: round2(salesAmount),
          purchase_cost: purchaseCost,
          profit_loss: profitLoss,
          margin,
          average_purchase_rate: round2(averagePurchaseRate),
        };
      })
      .filter((row) => row.sold_qty > 0 || row.sales_amount > 0)
      .sort((a, b) => a.product_name.localeCompare(b.product_name));

    res.json(rows);
  } catch (err) {
    console.error("GET /api/reports/product-profit-loss:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
