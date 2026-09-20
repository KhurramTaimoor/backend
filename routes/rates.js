const express = require("express");
const router = express.Router();
const db = require("../db");

const query = (sql, params = []) => new Promise((resolve, reject) => {
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
  const alters = [
    "ALTER TABLE sales_rates ADD COLUMN list_name VARCHAR(180) NULL AFTER id",
    "ALTER TABLE sales_rates ADD COLUMN customer_id INT NULL AFTER list_name",
    "ALTER TABLE sales_rates ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
  ];
  for (const sql of alters) {
    try { await query(sql); } catch (err) { if (err.code !== "ER_DUP_FIELDNAME") throw err; }
  }
}

router.use(async (_req, _res, next) => {
  try { await ensureSchema(); } catch (err) { console.error("Sales rate schema:", err.message); }
  next();
});

function parseOptions(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try { return JSON.parse(value); } catch { return []; }
}

function parseRow(row) {
  return { ...row, price_options: parseOptions(row.price_options) };
}

function cleanOptions(arr) {
  return (arr || []).map((p) => ({
    category_id: Number(p.category_id) || 0,
    product_type_id: Number(p.product_type_id) || 0,
    unit_id: Number(p.unit_id) || 0,
    single_rate: Number(p.single_rate) || 0,
    retail_rate: Number(p.retail_rate) || 0,
    wholesale_rate: Number(p.wholesale_rate) || 0,
    distributor_rate: Number(p.distributor_rate) || 0,
  })).filter((p) => p.category_id || p.product_type_id || p.unit_id || p.single_rate || p.retail_rate || p.wholesale_rate || p.distributor_rate);
}

async function selectSql(where = "", params = []) {
  return query(`SELECT sr.id, sr.list_name, sr.customer_id, sr.product_id, sr.price_options,
      sr.created_at, sr.updated_at, c.customer_name_en AS customer_name
    FROM sales_rates sr
    LEFT JOIN customers c ON c.id = sr.customer_id
    ${where}
    ORDER BY sr.id DESC`, params);
}

function validate(body) {
  const productId = Number(body.product_id) || 0;
  const cleaned = cleanOptions(body.price_options);
  if (!productId) return { error: "Product select karna zaroori hai!" };
  if (!cleaned.length) return { error: "Kam az kam ek price option zaroori hai!" };
  if (cleaned.some((p) => !p.category_id)) return { error: "Har row mein category select karna zaroori hai!" };
  if (cleaned.some((p) => !p.product_type_id)) return { error: "Har row mein product type select karna zaroori hai!" };
  return {
    data: {
      list_name: String(body.list_name || "Default Rate List").trim() || "Default Rate List",
      customer_id: Number(body.customer_id) || null,
      product_id: productId,
      price_options: JSON.stringify(cleaned),
    }
  };
}

router.get("/", async (_req, res) => {
  try { res.json((await selectSql()).map(parseRow)); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const rows = await selectSql("WHERE sr.id = ?", [Number(req.params.id)]);
    if (!rows.length) return res.status(404).json({ message: "Rate nahi mila!" });
    res.json(parseRow(rows[0]));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const checked = validate(req.body || {});
    if (checked.error) return res.status(400).json({ message: checked.error });
    const d = checked.data;
    const result = await query(
      `INSERT INTO sales_rates (list_name, customer_id, product_id, price_options) VALUES (?, ?, ?, ?)`,
      [d.list_name, d.customer_id, d.product_id, d.price_options]
    );
    const rows = await selectSql("WHERE sr.id = ?", [result.insertId]);
    res.status(201).json({ message: "Rate save ho gaya!", data: parseRow(rows[0]) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const checked = validate(req.body || {});
    if (checked.error) return res.status(400).json({ message: checked.error });
    const d = checked.data;
    const result = await query(
      `UPDATE sales_rates SET list_name = ?, customer_id = ?, product_id = ?, price_options = ? WHERE id = ?`,
      [d.list_name, d.customer_id, d.product_id, d.price_options, Number(req.params.id)]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Rate nahi mila update ke liye!" });
    const rows = await selectSql("WHERE sr.id = ?", [Number(req.params.id)]);
    res.json({ message: "Rate update ho gaya!", data: parseRow(rows[0]) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await query("DELETE FROM sales_rates WHERE id = ?", [Number(req.params.id)]);
    if (!result.affectedRows) return res.status(404).json({ message: "Rate nahi mila delete ke liye!" });
    res.json({ message: "Rate delete ho gaya!" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
