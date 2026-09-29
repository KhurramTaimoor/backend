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

const clean = (value) => String(value ?? "").trim();

const normalizeName = (value) => clean(value).toLowerCase();

const makeKey = ({ product_name, category_name, type_name }) =>
  [
    normalizeName(product_name) || "no-product",
    normalizeName(category_name) || "no-category",
    normalizeName(type_name) || "no-type",
  ].join("||");

const prefer = (...values) => {
  for (const value of values) {
    const v = clean(value);
    if (v) return v;
  }
  return "";
};

const splitOrderItems = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
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

async function loadMasterMaps() {
  const maps = {
    products: {},
    categories: {},
    types: {},
    units: {},
  };

  if (await tableExists("products")) {
    const cols = await getColumns("products");
    const nameCol = cols.has("product_name") ? "product_name" : cols.has("name") ? "name" : "id";

    const rows = await queryAsync(`SELECT id, ${nameCol} AS name FROM products`);
    rows.forEach((row) => {
      maps.products[String(row.id)] = clean(row.name);
    });
  }

  if (await tableExists("categories")) {
    const cols = await getColumns("categories");
    const nameCol = cols.has("category_name") ? "category_name" : cols.has("name") ? "name" : "id";

    const rows = await queryAsync(`SELECT id, ${nameCol} AS name FROM categories`);
    rows.forEach((row) => {
      maps.categories[String(row.id)] = clean(row.name);
    });
  }

  if (await tableExists("product_types")) {
    const cols = await getColumns("product_types");
    const nameCol = cols.has("product_type_en")
      ? "product_type_en"
      : cols.has("type_name")
      ? "type_name"
      : cols.has("name")
      ? "name"
      : "id";

    const rows = await queryAsync(`SELECT id, ${nameCol} AS name FROM product_types`);
    rows.forEach((row) => {
      maps.types[String(row.id)] = clean(row.name);
    });
  }

  if (await tableExists("units")) {
    const cols = await getColumns("units");
    const nameCol = cols.has("unit_name") ? "unit_name" : cols.has("symbol") ? "symbol" : cols.has("name") ? "name" : "id";

    const rows = await queryAsync(`SELECT id, ${nameCol} AS name FROM units`);
    rows.forEach((row) => {
      maps.units[String(row.id)] = clean(row.name);
    });
  }

  return maps;
}

function resolveRowNames(row, maps = {}) {
  const productName = prefer(
    row.product_name,
    row.product,
    row.item_name,
    row.product_id ? maps.products[String(row.product_id)] : ""
  );

  const categoryName = prefer(
    row.category_name,
    row.category,
    row.category_id ? maps.categories[String(row.category_id)] : ""
  );

  const typeName = prefer(
    row.type_name,
    row.product_type_name,
    row.product_type,
    row.product_type_en,
    row.product_type_id ? maps.types[String(row.product_type_id)] : ""
  );

  const unitName = prefer(
    row.unit_name,
    row.unit,
    row.symbol,
    row.unit_id ? maps.units[String(row.unit_id)] : ""
  );

  return {
    product_id: row.product_id || "",
    product_name: productName || "—",
    category_name: categoryName || "—",
    type_name: typeName || "—",
    unit_name: unitName || "—",
  };
}

function addStock(bucket, row, qty, maps, source = "stock") {
  const names = resolveRowNames(row, maps);
  if (!names.product_name || names.product_name === "—") return;

  const key = makeKey(names);

  if (!bucket[key]) {
    bucket[key] = {
      product_id: names.product_id || "",
      product_name: names.product_name,
      category_name: names.category_name,
      type_name: names.type_name,
      unit_name: names.unit_name,
      available_stock: 0,
      sources: {},
    };
  }

  if (bucket[key].unit_name === "—" && names.unit_name !== "—") {
    bucket[key].unit_name = names.unit_name;
  }

  bucket[key].available_stock += toNumber(qty);
  bucket[key].sources[source] = (bucket[key].sources[source] || 0) + toNumber(qty);
}

function addDemand(bucket, row, qty, orderNo, maps) {
  const names = resolveRowNames(row, maps);
  if (!names.product_name || names.product_name === "—") return;

  const key = makeKey(names);

  if (!bucket[key]) {
    bucket[key] = {
      product_id: names.product_id || "",
      product_name: names.product_name,
      category_name: names.category_name,
      type_name: names.type_name,
      unit_name: names.unit_name,
      ordered_qty: 0,
      orderNos: new Set(),
    };
  }

  if (bucket[key].unit_name === "—" && names.unit_name !== "—") {
    bucket[key].unit_name = names.unit_name;
  }

  bucket[key].ordered_qty += toNumber(qty);
  if (orderNo) bucket[key].orderNos.add(orderNo);
}

async function loadAvailableStock(maps) {
  const stock = {};

  // Opening stock: incoming
  if (await tableExists("opening_stock")) {
    const cols = await getColumns("opening_stock");

    const select = [
      "product_id",
      cols.has("product_type_id") ? "product_type_id" : "NULL AS product_type_id",
      cols.has("category_id") ? "category_id" : "NULL AS category_id",
      cols.has("warehouse") ? "warehouse" : "'' AS warehouse",
      cols.has("quantity") ? "quantity" : "0 AS quantity",
    ];

    const rows = await queryAsync(`SELECT ${select.join(", ")} FROM opening_stock`);

    rows.forEach((row) => {
      addStock(stock, row, row.quantity, maps, "opening_stock");
    });
  }

  // Stock receive: incoming
  if (await tableExists("stock_receive_items")) {
    const rows = await queryAsync(
      `
      SELECT
        product_name,
        category_name,
        type_name,
        unit_name,
        received_qty
      FROM stock_receive_items
      `
    );

    rows.forEach((row) => {
      addStock(stock, row, row.received_qty, maps, "stock_receive");
    });
  }

  // Purchase invoices: incoming fallback, useful when stock receive is not used.
  // If your business flow uses both purchase invoice and stock receive for same goods,
  // remove this block to avoid double counting.
  if (await tableExists("purchase_invoice_items")) {
    const rows = await queryAsync(
      `
      SELECT
        product_id,
        product_name,
        category_name,
        type_name,
        unit_name,
        quantity
      FROM purchase_invoice_items
      `
    );

    rows.forEach((row) => {
      addStock(stock, row, row.quantity, maps, "purchase_invoice");
    });
  }

  // Stock issue: outgoing
  if (await tableExists("stock_issue_items")) {
    const rows = await queryAsync(
      `
      SELECT
        product_name,
        category_name,
        type_name,
        issued_qty
      FROM stock_issue_items
      `
    );

    rows.forEach((row) => {
      addStock(stock, row, -toNumber(row.issued_qty), maps, "stock_issue");
    });
  }

  // Sales invoices: outgoing
  if (await tableExists("sales_invoice_items")) {
    const rows = await queryAsync(
      `
      SELECT
        product_id,
        product_name,
        category_id,
        category_name,
        unit_id,
        unit_name,
        qty,
        pieces_qty
      FROM sales_invoice_items
      `
    );

    rows.forEach((row) => {
      addStock(stock, row, -toNumber(row.pieces_qty || row.qty), maps, "sales_invoice");
    });
  }

  // Sales returns: incoming
  if (await tableExists("sales_returns")) {
    const rows = await queryAsync(
      `
      SELECT
        product_id,
        product_name,
        return_qty
      FROM sales_returns
      `
    );

    rows.forEach((row) => {
      addStock(stock, row, row.return_qty, maps, "sales_return");
    });
  }

  // Purchase returns: outgoing
  if (await tableExists("purchase_return_items")) {
    const rows = await queryAsync(
      `
      SELECT
        product_id,
        product_name,
        category_name,
        type_name,
        unit_name,
        quantity
      FROM purchase_return_items
      `
    );

    rows.forEach((row) => {
      addStock(stock, row, -toNumber(row.quantity), maps, "purchase_return");
    });
  }

  return stock;
}

async function loadSaleOrderDemand(maps) {
  const demand = {};

  if (!(await tableExists("sale_orders"))) {
    return demand;
  }

  const orderCols = await getColumns("sale_orders");
  const hasItemsTable = await tableExists("sale_order_items");

  // Preferred structure: sale_order_items table
  if (hasItemsTable) {
    const itemCols = await getColumns("sale_order_items");

    const select = [
      itemCols.has("sale_order_id") ? "soi.sale_order_id" : "NULL AS sale_order_id",
      itemCols.has("product_id") ? "soi.product_id" : "NULL AS product_id",
      itemCols.has("product_name") ? "soi.product_name" : "NULL AS product_name",
      itemCols.has("category_id") ? "soi.category_id" : "NULL AS category_id",
      itemCols.has("category_name") ? "soi.category_name" : "NULL AS category_name",
      itemCols.has("product_type_id") ? "soi.product_type_id" : "NULL AS product_type_id",
      itemCols.has("type_name") ? "soi.type_name" : "NULL AS type_name",
      itemCols.has("unit_id") ? "soi.unit_id" : "NULL AS unit_id",
      itemCols.has("unit_name") ? "soi.unit_name" : "NULL AS unit_name",
      itemCols.has("order_qty") ? "soi.order_qty" : itemCols.has("qty") ? "soi.qty AS order_qty" : "0 AS order_qty",
      orderCols.has("order_no") ? "so.order_no" : "CONCAT('SO-', so.id) AS order_no",
      orderCols.has("status") ? "so.status" : "'pending' AS status",
    ];

    const joinColumn = itemCols.has("sale_order_id") ? "soi.sale_order_id = so.id" : "1 = 0";

    const rows = await queryAsync(
      `
      SELECT ${select.join(", ")}
      FROM sale_order_items soi
      INNER JOIN sale_orders so ON ${joinColumn}
      `
    );

    rows.forEach((row) => {
      const status = normalizeName(row.status);
      if (status === "cancelled" || status === "canceled") return;
      addDemand(demand, row, row.order_qty, row.order_no, maps);
    });

    return demand;
  }

  // Alternate structure: sale_orders has order_items JSON column
  if (orderCols.has("order_items")) {
    const select = [
      "id",
      orderCols.has("order_no") ? "order_no" : "CONCAT('SO-', id) AS order_no",
      orderCols.has("status") ? "status" : "'pending' AS status",
      "order_items",
    ];

    const orders = await queryAsync(`SELECT ${select.join(", ")} FROM sale_orders`);

    orders.forEach((order) => {
      const status = normalizeName(order.status);
      if (status === "cancelled" || status === "canceled") return;

      const items = splitOrderItems(order.order_items);

      items.forEach((item) => {
        addDemand(
          demand,
          {
            product_id: item.product_id,
            product_name: item.product_name,
            category_id: item.category_id,
            category_name: item.category_name,
            product_type_id: item.product_type_id,
            type_name: item.type_name,
            unit_id: item.unit_id,
            unit_name: item.unit_name,
          },
          item.order_qty ?? item.qty ?? item.quantity,
          order.order_no,
          maps
        );
      });
    });
  }

  return demand;
}

// GET /api/stock-demand
router.get("/", async (req, res) => {
  try {
    const maps = await loadMasterMaps();

    const [stock, demand] = await Promise.all([
      loadAvailableStock(maps),
      loadSaleOrderDemand(maps),
    ]);

    const keys = new Set([...Object.keys(demand), ...Object.keys(stock)]);

    const rows = [...keys]
      .map((key, index) => {
        const d = demand[key] || {};
        const s = stock[key] || {};

        const orderedQty = toNumber(d.ordered_qty);
        const availableStock = toNumber(s.available_stock);
        const demandQty = Math.max(orderedQty - availableStock, 0);

        return {
          id: index + 1,
          product_id: d.product_id || s.product_id || "",
          product_name: d.product_name || s.product_name || "—",
          category_name: d.category_name || s.category_name || "—",
          type_name: d.type_name || s.type_name || "—",
          unit_name: d.unit_name || s.unit_name || "—",
          sale_orders: d.orderNos ? [...d.orderNos].join(", ") : "—",
          ordered_qty: orderedQty,
          available_stock: availableStock,
          demand_qty: demandQty,
        };
      })
      .filter((row) => row.ordered_qty > 0)
      .sort((a, b) => b.demand_qty - a.demand_qty || a.product_name.localeCompare(b.product_name));

    res.json(rows);
  } catch (err) {
    console.error("GET /api/stock-demand:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
