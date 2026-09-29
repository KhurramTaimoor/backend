const express = require("express");
const router = express.Router();
const db = require("../db");

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
  });

async function ensureSchema() {
  await query(`CREATE TABLE IF NOT EXISTS sales_rates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    list_name VARCHAR(180) NULL,
    customer_id INT NULL,
    product_id INT NOT NULL,
    price_options LONGTEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sales_rates_customer(customer_id),
    INDEX idx_sales_rates_product(product_id),
    INDEX idx_sales_rates_list(list_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const alters = [
    "ALTER TABLE sales_rates ADD COLUMN list_name VARCHAR(180) NULL AFTER id",
    "ALTER TABLE sales_rates ADD COLUMN customer_id INT NULL AFTER list_name",
    "ALTER TABLE sales_rates ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
  ];

  for (const sql of alters) {
    try {
      await query(sql);
    } catch (err) {
      if (err.code !== "ER_DUP_FIELDNAME") throw err;
    }
  }

  try {
    await query("ALTER TABLE sales_rates ADD INDEX idx_sales_rates_list (list_name)");
  } catch (err) {
    if (!["ER_DUP_KEYNAME", "ER_DUP_FIELDNAME"].includes(err.code)) throw err;
  }

  await query(`CREATE TABLE IF NOT EXISTS sales_rate_list_customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    list_name VARCHAR(180) NOT NULL,
    customer_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_rate_list_customer (list_name, customer_id),
    INDEX idx_rate_list_assign_list (list_name),
    INDEX idx_rate_list_assign_customer (customer_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

router.use(async (_req, _res, next) => {
  try {
    await ensureSchema();
  } catch (err) {
    console.error("Sales rate schema:", err.message);
  }
  next();
});

function parseOptions(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function cleanText(value) {
  return String(value || "").trim();
}

function cleanOptions(arr) {
  return (arr || [])
    .map((p) => ({
      category_id: Number(p.category_id) || 0,
      product_type_id: Number(p.product_type_id) || 0,
      unit_id: Number(p.unit_id) || 0,
      single_rate: Number(p.single_rate) || 0,
      retail_rate: Number(p.retail_rate) || 0,
      wholesale_rate: Number(p.wholesale_rate) || 0,
      distributor_rate: Number(p.distributor_rate) || 0,
    }))
    .filter(
      (p) =>
        p.category_id ||
        p.product_type_id ||
        p.unit_id ||
        p.single_rate ||
        p.retail_rate ||
        p.wholesale_rate ||
        p.distributor_rate
    );
}

async function assignmentMap() {
  const rows = await query(`
    SELECT a.list_name, a.customer_id, c.customer_name_en AS customer_name
    FROM sales_rate_list_customers a
    LEFT JOIN customers c ON c.id = a.customer_id
    ORDER BY c.customer_name_en ASC, a.customer_id ASC
  `);

  const map = {};
  rows.forEach((row) => {
    const key = String(row.list_name || "Default Rate List");
    if (!map[key]) map[key] = [];
    map[key].push({
      customer_id: Number(row.customer_id),
      customer_name: row.customer_name || `#${row.customer_id}`,
    });
  });
  return map;
}

function enrichRow(row, assignments) {
  const listName = row.list_name || "Default Rate List";
  const assignedCustomers = assignments[listName] || [];
  return {
    ...row,
    list_name: listName,
    price_options: parseOptions(row.price_options),
    assigned_customer_ids: assignedCustomers.map((x) => x.customer_id),
    assigned_customers: assignedCustomers,
  };
}

async function selectSql(where = "", params = []) {
  const rows = await query(
    `SELECT sr.id, sr.list_name, sr.customer_id, sr.product_id, sr.price_options,
      sr.created_at, sr.updated_at, c.customer_name_en AS customer_name
     FROM sales_rates sr
     LEFT JOIN customers c ON c.id = sr.customer_id
     ${where}
     ORDER BY sr.id DESC`,
    params
  );
  const assignments = await assignmentMap();
  return rows.map((row) => enrichRow(row, assignments));
}

function validateLegacy(body) {
  const productId = Number(body.product_id) || 0;
  const cleaned = cleanOptions(body.price_options);
  if (!productId) return { error: "Product select karna zaroori hai!" };
  if (!cleaned.length) return { error: "Kam az kam ek price option zaroori hai!" };
  return {
    data: {
      list_name: cleanText(body.list_name) || "Default Rate List",
      customer_id: Number(body.customer_id) || null,
      product_id: productId,
      price_options: JSON.stringify(cleaned),
    },
  };
}

function normalizeBulkItem(item) {
  const productId = Number(item.product_id) || 0;
  if (!productId) return null;

  let options = cleanOptions(item.price_options);
  if (!options.length) {
    options = [
      {
        category_id: Number(item.category_id) || 0,
        product_type_id: Number(item.product_type_id) || 0,
        unit_id: Number(item.unit_id) || 0,
        single_rate: Number(item.single_rate) || 0,
        retail_rate: Number(item.retail_rate) || 0,
        wholesale_rate: Number(item.wholesale_rate) || 0,
        distributor_rate: Number(item.distributor_rate) || 0,
      },
    ];
  }

  return {
    product_id: productId,
    price_options: JSON.stringify(options),
  };
}

async function getListSummary(listName) {
  const items = await selectSql("WHERE COALESCE(sr.list_name, 'Default Rate List') = ?", [
    listName,
  ]);
  const assignments = await assignmentMap();
  const assignedCustomers = assignments[listName] || [];
  return {
    list_name: listName,
    product_count: items.length,
    assigned_customer_ids: assignedCustomers.map((x) => x.customer_id),
    assigned_customers: assignedCustomers,
    items,
  };
}

// ---------------------------------------------------------------------------
// Named rate-list APIs (new bulk workflow)
// ---------------------------------------------------------------------------
router.get("/lists", async (_req, res) => {
  try {
    const grouped = await query(`
      SELECT
        COALESCE(NULLIF(TRIM(list_name), ''), 'Default Rate List') AS list_name,
        COUNT(*) AS product_count,
        MAX(updated_at) AS updated_at,
        MAX(created_at) AS created_at
      FROM sales_rates
      GROUP BY COALESCE(NULLIF(TRIM(list_name), ''), 'Default Rate List')
      ORDER BY MAX(updated_at) DESC, list_name ASC
    `);
    const assignments = await assignmentMap();
    const data = grouped.map((row) => {
      const customers = assignments[row.list_name] || [];
      return {
        ...row,
        product_count: Number(row.product_count || 0),
        assigned_customer_ids: customers.map((x) => x.customer_id),
        assigned_customers: customers,
      };
    });
    res.json({ success: true, data, lists: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/lists/:listName", async (req, res) => {
  try {
    const listName = cleanText(req.params.listName) || "Default Rate List";
    const data = await getListSummary(listName);
    if (!data.items.length) {
      return res.status(404).json({ success: false, message: "Rate list nahi mili." });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

async function saveBulkList(oldListName, body) {
  const listName = cleanText(body.list_name) || cleanText(oldListName);
  if (!listName) throw new Error("Rate List Name zaroori hai.");

  const incoming = Array.isArray(body.items) ? body.items : [];
  const items = incoming.map(normalizeBulkItem).filter(Boolean);
  if (!items.length) throw new Error("Kam az kam ek product zaroori hai.");

  const sourceName = cleanText(oldListName);
  if (sourceName) {
    await query(
      "DELETE FROM sales_rates WHERE COALESCE(NULLIF(TRIM(list_name), ''), 'Default Rate List') = ?",
      [sourceName]
    );
    if (sourceName !== listName) {
      await query("UPDATE sales_rate_list_customers SET list_name = ? WHERE list_name = ?", [
        listName,
        sourceName,
      ]);
    }
  } else {
    await query(
      "DELETE FROM sales_rates WHERE COALESCE(NULLIF(TRIM(list_name), ''), 'Default Rate List') = ?",
      [listName]
    );
  }

  for (const item of items) {
    await query(
      `INSERT INTO sales_rates (list_name, customer_id, product_id, price_options)
       VALUES (?, NULL, ?, ?)`,
      [listName, item.product_id, item.price_options]
    );
  }

  return getListSummary(listName);
}

router.post("/lists", async (req, res) => {
  try {
    const data = await saveBulkList("", req.body || {});
    res.status(201).json({ success: true, message: "Rate list save ho gayi.", data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put("/lists/:listName", async (req, res) => {
  try {
    const data = await saveBulkList(cleanText(req.params.listName), req.body || {});
    res.json({ success: true, message: "Rate list update ho gayi.", data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post("/lists/:listName/assign-customers", async (req, res) => {
  try {
    const listName = cleanText(req.params.listName);
    if (!listName) return res.status(400).json({ success: false, message: "Rate list zaroori hai." });

    const ids = [...new Set((Array.isArray(req.body?.customer_ids) ? req.body.customer_ids : [])
      .map(Number)
      .filter((id) => id > 0))];

    await query("DELETE FROM sales_rate_list_customers WHERE list_name = ?", [listName]);
    for (const customerId of ids) {
      await query(
        "INSERT IGNORE INTO sales_rate_list_customers (list_name, customer_id) VALUES (?, ?)",
        [listName, customerId]
      );
    }

    const data = await getListSummary(listName);
    res.json({ success: true, message: "Customers assign ho gaye.", data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/lists/:listName", async (req, res) => {
  try {
    const listName = cleanText(req.params.listName);
    await query(
      "DELETE FROM sales_rates WHERE COALESCE(NULLIF(TRIM(list_name), ''), 'Default Rate List') = ?",
      [listName]
    );
    await query("DELETE FROM sales_rate_list_customers WHERE list_name = ?", [listName]);
    res.json({ success: true, message: "Rate list delete ho gayi." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// Legacy row APIs (kept for backward compatibility)
// ---------------------------------------------------------------------------
router.get("/", async (_req, res) => {
  try {
    res.json(await selectSql());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const rows = await selectSql("WHERE sr.id = ?", [Number(req.params.id)]);
    if (!rows.length) return res.status(404).json({ message: "Rate nahi mila!" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const checked = validateLegacy(req.body || {});
    if (checked.error) return res.status(400).json({ message: checked.error });
    const d = checked.data;
    const result = await query(
      `INSERT INTO sales_rates (list_name, customer_id, product_id, price_options) VALUES (?, ?, ?, ?)`,
      [d.list_name, d.customer_id, d.product_id, d.price_options]
    );
    const rows = await selectSql("WHERE sr.id = ?", [result.insertId]);
    res.status(201).json({ message: "Rate save ho gaya!", data: rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const checked = validateLegacy(req.body || {});
    if (checked.error) return res.status(400).json({ message: checked.error });
    const d = checked.data;
    const result = await query(
      `UPDATE sales_rates SET list_name = ?, customer_id = ?, product_id = ?, price_options = ? WHERE id = ?`,
      [d.list_name, d.customer_id, d.product_id, d.price_options, Number(req.params.id)]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Rate nahi mila update ke liye!" });
    const rows = await selectSql("WHERE sr.id = ?", [Number(req.params.id)]);
    res.json({ message: "Rate update ho gaya!", data: rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await query("DELETE FROM sales_rates WHERE id = ?", [Number(req.params.id)]);
    if (!result.affectedRows) return res.status(404).json({ message: "Rate nahi mila delete ke liye!" });
    res.json({ message: "Rate delete ho gaya!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
