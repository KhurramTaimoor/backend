const express = require("express");
const router = express.Router();
const db = require("../db");

const queryAsync = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)))
  );
const cleanText = (value) => String(value ?? "").trim() || null;
const cleanId = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const cleanNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

async function columns(table) {
  const rows = await queryAsync(`SHOW COLUMNS FROM \`${table}\``);
  return new Set(rows.map((r) => r.Field));
}

async function addColumnIfMissing(table, column, definition) {
  const cols = await columns(table);
  if (!cols.has(column)) {
    await queryAsync(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function ensureSchema() {
  await queryAsync(`CREATE TABLE IF NOT EXISTS purchase_rates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    list_name VARCHAR(180) NULL,
    supplier_id INT NULL,
    supplier_name VARCHAR(255) NULL,
    product_id INT NULL,
    product_name VARCHAR(255) NOT NULL,
    unit_id INT NULL,
    unit_name VARCHAR(120) NULL,
    category_id INT NULL,
    category_name VARCHAR(180) NULL,
    product_type_id INT NULL,
    type_name VARCHAR(180) NULL,
    rate DECIMAL(18,4) NULL,
    quantity DECIMAL(18,4) NULL,
    effective_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_purchase_rate_supplier (supplier_id),
    INDEX idx_purchase_rate_product (product_id),
    INDEX idx_purchase_rate_effective (effective_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const additions = [
    ["list_name", "VARCHAR(180) NULL AFTER id"],
    ["supplier_id", "INT NULL AFTER list_name"],
    ["product_id", "INT NULL AFTER supplier_name"],
    ["unit_id", "INT NULL AFTER product_name"],
    ["category_id", "INT NULL AFTER unit_name"],
    ["product_type_id", "INT NULL AFTER category_name"],
    ["updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
  ];
  for (const [column, definition] of additions) {
    await addColumnIfMissing("purchase_rates", column, definition);
  }
}

router.use(async (_req, _res, next) => {
  try {
    await ensureSchema();
  } catch (e) {
    console.error("Purchase rate schema:", e.message);
  }
  next();
});

async function lookupId(table, nameColumn, name) {
  if (!name) return null;
  try {
    const rows = await queryAsync(
      `SELECT id FROM \`${table}\` WHERE LOWER(TRIM(\`${nameColumn}\`)) = LOWER(TRIM(?)) LIMIT 1`,
      [name]
    );
    return rows[0]?.id || null;
  } catch {
    return null;
  }
}

async function enrichItem(item = {}) {
  const product_name = cleanText(item.product_name);
  const unit_name = cleanText(item.unit_name);
  const category_name = cleanText(item.category_name);
  const type_name = cleanText(item.type_name);

  let product_id = cleanId(item.product_id);
  let unit_id = cleanId(item.unit_id);
  let category_id = cleanId(item.category_id);
  let product_type_id = cleanId(item.product_type_id);

  if (!product_id && product_name) product_id = await lookupId("products", "product_name", product_name);
  if (!unit_id && unit_name) unit_id = await lookupId("units", "unit_name", unit_name);
  if (!category_id && category_name) category_id = await lookupId("categories", "category_name", category_name);
  if (!product_type_id && type_name) {
    for (const col of ["product_type_en", "type_name", "name"]) {
      try {
        product_type_id = await lookupId("product_types", col, type_name);
        if (product_type_id) break;
      } catch {}
    }
  }

  return {
    product_id,
    product_name,
    unit_id,
    unit_name,
    category_id,
    category_name,
    product_type_id,
    type_name,
    rate: cleanNumber(item.rate),
    quantity: cleanNumber(item.quantity),
    effective_date: cleanText(item.effective_date),
  };
}

async function normalizeProducts(products) {
  if (!Array.isArray(products)) return [];
  const result = [];
  for (const item of products) {
    const normalized = await enrichItem(item);
    if (normalized.product_name || normalized.product_id) result.push(normalized);
  }
  return result;
}

const makeKey = (list, supplier) => `${list || "Default Purchase Rate"}|||${supplier || ""}`;
const parseKey = (raw) => {
  const s = decodeURIComponent(raw || "");
  const [list_name, ...rest] = s.split("|||");
  return {
    list_name: list_name || "Default Purchase Rate",
    supplier_name: rest.join("|||") || null,
  };
};

async function resolveSupplierId(supplier_id, supplier_name) {
  const explicit = cleanId(supplier_id);
  if (explicit) return explicit;
  return lookupId("suppliers", "supplier_name", cleanText(supplier_name));
}

async function insertRows(list_name, supplier_id, supplier_name, products) {
  const inserted = [];
  for (const item of products) {
    const r = await queryAsync(
      `INSERT INTO purchase_rates
       (list_name,supplier_id,supplier_name,product_id,product_name,unit_id,unit_name,category_id,category_name,product_type_id,type_name,rate,quantity,effective_date)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        list_name,
        supplier_id,
        supplier_name,
        item.product_id,
        item.product_name || `Product #${item.product_id}`,
        item.unit_id,
        item.unit_name,
        item.category_id,
        item.category_name,
        item.product_type_id,
        item.type_name,
        item.rate,
        item.quantity,
        item.effective_date,
      ]
    );
    inserted.push({ ...item, id: r.insertId, list_name, supplier_id, supplier_name });
  }
  return inserted;
}

router.get("/flat", async (_req, res) => {
  try {
    const rows = await queryAsync(`SELECT * FROM purchase_rates ORDER BY COALESCE(effective_date,'1900-01-01') DESC, id DESC`);
    const result = [];
    for (const row of rows) {
      const supplier_id = row.supplier_id || (await resolveSupplierId(null, row.supplier_name));
      const item = await enrichItem(row);
      result.push({
        id: row.id,
        list_name: row.list_name || "Default Purchase Rate",
        customer_id: supplier_id || null,
        supplier_id: supplier_id || null,
        supplier_name: row.supplier_name || null,
        product_id: item.product_id,
        product_name: item.product_name || row.product_name || "",
        price_options: [
          {
            category_id: item.category_id,
            product_type_id: item.product_type_id,
            unit_id: item.unit_id,
            retail_rate: Number(row.rate || 0),
            wholesale_rate: Number(row.rate || 0),
            distributor_rate: Number(row.rate || 0),
            purchase_rate: Number(row.rate || 0),
            quantity: row.quantity == null ? null : Number(row.quantity),
            effective_date: row.effective_date || null,
          },
        ],
      });
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/resolve", async (req, res) => {
  try {
    const supplier_id = cleanId(req.query.supplier_id);
    const product_id = cleanId(req.query.product_id);
    const invoiceDate = cleanText(req.query.date);
    if (!product_id && !cleanText(req.query.product_name)) {
      return res.status(400).json({ message: "product_id or product_name is required" });
    }

    const rows = await queryAsync(`SELECT * FROM purchase_rates ORDER BY COALESCE(effective_date,'1900-01-01') DESC, id DESC`);
    let best = null;
    let bestScore = -1;
    for (const row of rows) {
      const item = await enrichItem(row);
      const rowSupplierId = row.supplier_id || (await resolveSupplierId(null, row.supplier_name));
      const productMatches = product_id
        ? String(item.product_id || "") === String(product_id)
        : String(item.product_name || "").toLowerCase() === String(req.query.product_name || "").trim().toLowerCase();
      if (!productMatches) continue;
      if (supplier_id && rowSupplierId && String(rowSupplierId) !== String(supplier_id)) continue;
      if (invoiceDate && row.effective_date && String(row.effective_date).slice(0, 10) > invoiceDate) continue;

      let score = 0;
      if (supplier_id && rowSupplierId && String(rowSupplierId) === String(supplier_id)) score += 16;
      const checks = [
        [item.category_id, req.query.category_id, 4],
        [item.product_type_id, req.query.product_type_id, 4],
        [item.unit_id, req.query.unit_id, 2],
      ];
      let rejected = false;
      for (const [configured, wanted, points] of checks) {
        if (configured && wanted && String(configured) === String(wanted)) score += points;
        else if (configured && wanted && String(configured) !== String(wanted)) { rejected = true; break; }
      }
      if (rejected) continue;
      if (score > bestScore) {
        bestScore = score;
        best = { ...row, supplier_id: rowSupplierId, ...item };
      }
    }

    res.json({ success: true, data: best ? { ...best, rate: Number(best.rate || 0) } : null });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/", async (_req, res) => {
  try {
    const rows = await queryAsync(`SELECT * FROM purchase_rates ORDER BY id DESC`);
    const grouped = {};
    for (const row of rows) {
      const list = row.list_name || "Default Purchase Rate";
      const supplier = row.supplier_name || null;
      const key = makeKey(list, supplier);
      if (!grouped[key]) {
        grouped[key] = {
          id: row.id,
          group_key: key,
          list_name: list,
          supplier_id: row.supplier_id || null,
          supplier_name: supplier,
          products: [],
        };
      }
      grouped[key].products.push({
        id: row.id,
        product_id: row.product_id || null,
        product_name: row.product_name || "",
        unit_id: row.unit_id || null,
        unit_name: row.unit_name || "",
        category_id: row.category_id || null,
        category_name: row.category_name || "",
        product_type_id: row.product_type_id || null,
        type_name: row.type_name || "",
        rate: row.rate == null ? null : Number(row.rate),
        quantity: row.quantity == null ? null : Number(row.quantity),
        effective_date: row.effective_date || null,
      });
    }
    res.json(Object.values(grouped));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const list_name = cleanText(req.body.list_name) || "Default Purchase Rate";
    const supplier_name = cleanText(req.body.supplier_name);
    const supplier_id = await resolveSupplierId(req.body.supplier_id, supplier_name);
    const products = await normalizeProducts(req.body.products);
    if (!products.length) return res.status(400).json({ message: "Kam az kam aik product zaroori hai!" });
    const inserted = await insertRows(list_name, supplier_id, supplier_name, products);
    res.status(201).json({
      message: "Purchase rates save ho gaye!",
      data: { id: inserted[0].id, group_key: makeKey(list_name, supplier_name), list_name, supplier_id, supplier_name, products: inserted },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/:group_key", async (req, res) => {
  try {
    const old = parseKey(req.params.group_key);
    const list_name = cleanText(req.body.list_name) || "Default Purchase Rate";
    const supplier_name = cleanText(req.body.supplier_name);
    const supplier_id = await resolveSupplierId(req.body.supplier_id, supplier_name);
    const products = await normalizeProducts(req.body.products);
    if (!products.length) return res.status(400).json({ message: "Kam az kam aik product zaroori hai!" });
    await queryAsync(
      `DELETE FROM purchase_rates WHERE COALESCE(list_name,'Default Purchase Rate') = ? AND COALESCE(supplier_name,'') = ?`,
      [old.list_name, old.supplier_name || ""]
    );
    const inserted = await insertRows(list_name, supplier_id, supplier_name, products);
    res.json({
      message: "Purchase rates update ho gaye!",
      data: { id: inserted[0].id, group_key: makeKey(list_name, supplier_name), list_name, supplier_id, supplier_name, products: inserted },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.delete("/:group_key", async (req, res) => {
  try {
    const g = parseKey(req.params.group_key);
    await queryAsync(
      `DELETE FROM purchase_rates WHERE COALESCE(list_name,'Default Purchase Rate')=? AND COALESCE(supplier_name,'')=?`,
      [g.list_name, g.supplier_name || ""]
    );
    res.json({ message: "Purchase rates delete ho gaye!" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
