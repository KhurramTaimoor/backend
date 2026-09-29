const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const query = `
    SELECT b.*, c.category_name
    FROM bom b
    LEFT JOIN categories c ON b.product_category_id = c.id
    ORDER BY b.id DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post("/", (req, res) => {
  const { product_name, product_category_id, bom_type, batch_size, raw_material, qty, rate, labor_cost } = req.body;
  if (!product_name) return res.status(400).json({ error: "Product name zaroori hai!" });
  const q = parseFloat(qty) || 0;
  const r = parseFloat(rate) || 0;
  const total = (q * r).toFixed(2);
  const labor = parseFloat(labor_cost) || 0;
  db.query(
    `INSERT INTO bom (product_name, product_category_id, bom_type, batch_size, raw_material, qty, rate, total, labor_cost) VALUES (?,?,?,?,?,?,?,?,?)`,
    [product_name, product_category_id || null, bom_type, parseFloat(batch_size) || 0, raw_material, q, r, total, labor],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "BOM save ho gaya!", id: result.insertId });
    }
  );
});

router.put("/:id", (req, res) => {
  const { product_name, product_category_id, bom_type, batch_size, raw_material, qty, rate, labor_cost } = req.body;
  if (!product_name) return res.status(400).json({ error: "Product name zaroori hai!" });
  const q = parseFloat(qty) || 0;
  const r = parseFloat(rate) || 0;
  const total = (q * r).toFixed(2);
  const labor = parseFloat(labor_cost) || 0;
  db.query(
    `UPDATE bom
     SET product_name = ?, product_category_id = ?, bom_type = ?, batch_size = ?, raw_material = ?, qty = ?, rate = ?, total = ?, labor_cost = ?
     WHERE id = ?`,
    [product_name, product_category_id || null, bom_type, parseFloat(batch_size) || 0, raw_material, q, r, total, labor, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "BOM update ho gaya!" });
    }
  );
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM bom WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted!" });
  });
});

module.exports = router;
