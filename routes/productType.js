const express = require("express");
const router = express.Router();
const db = require("../db");

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

async function ensureSchema() {
  await runQuery(`CREATE TABLE IF NOT EXISTS product_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_type_en VARCHAR(180) NULL,
    type_name VARCHAR(180) NULL,
    type_code VARCHAR(50) NULL,
    short_code VARCHAR(30) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const cols = new Set((await runQuery("SHOW COLUMNS FROM product_types")).map((r) => r.Field));
  const additions = [
    ["product_type_en", "ALTER TABLE product_types ADD COLUMN product_type_en VARCHAR(180) NULL"],
    ["type_name", "ALTER TABLE product_types ADD COLUMN type_name VARCHAR(180) NULL"],
    ["type_code", "ALTER TABLE product_types ADD COLUMN type_code VARCHAR(50) NULL"],
    ["short_code", "ALTER TABLE product_types ADD COLUMN short_code VARCHAR(30) NULL"],
    ["created_at", "ALTER TABLE product_types ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"],
  ];
  for (const [name, sql] of additions) if (!cols.has(name)) await runQuery(sql);
  // Keep both legacy and current naming columns usable without deleting either.
  await runQuery(`UPDATE product_types SET product_type_en = COALESCE(NULLIF(product_type_en,''), type_name), type_name = COALESCE(NULLIF(type_name,''), product_type_en)`);
}

router.use(async (_req, res, next) => {
  try { await ensureSchema(); next(); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/", async (_req, res) => {
  try {
    const results = await runQuery(`SELECT id, COALESCE(NULLIF(product_type_en,''), type_name) AS product_type_en, COALESCE(NULLIF(type_name,''), product_type_en) AS type_name, type_code, short_code, created_at FROM product_types ORDER BY id DESC`);
    res.json(results);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const name = String(req.body.product_type_en ?? req.body.type_name ?? "").trim();
    if (!name) return res.status(400).json({ message: "Product type name is required." });
    const code = String(req.body.type_code || "").trim() || null;
    const short = String(req.body.short_code || "").trim() || null;
    const result = await runQuery(`INSERT INTO product_types (product_type_en,type_name,type_code,short_code) VALUES (?,?,?,?)`, [name, name, code, short]);
    const [record] = await runQuery(`SELECT id, product_type_en, type_name, type_code, short_code, created_at FROM product_types WHERE id=?`, [result.insertId]);
    res.json({ message: "Saved!", data: record });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const name = String(req.body.product_type_en ?? req.body.type_name ?? "").trim();
    if (!name) return res.status(400).json({ message: "Product type name is required." });
    await runQuery(`UPDATE product_types SET product_type_en=?, type_name=?, type_code=COALESCE(?,type_code), short_code=COALESCE(?,short_code) WHERE id=?`, [name, name, String(req.body.type_code || "").trim() || null, String(req.body.short_code || "").trim() || null, req.params.id]);
    const [record] = await runQuery(`SELECT id, product_type_en, type_name, type_code, short_code, created_at FROM product_types WHERE id=?`, [req.params.id]);
    res.json({ message: "Updated!", data: record });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete("/:id", async (req, res) => {
  try { await runQuery(`DELETE FROM product_types WHERE id=?`, [req.params.id]); res.json({ message: "Deleted!" }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
