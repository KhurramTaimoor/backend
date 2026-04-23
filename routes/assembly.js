const express = require("express");
const router = express.Router();
const db = require("../db");

const ensureAssemblyColumns = () => {
  db.query("SHOW COLUMNS FROM assembly LIKE 'product_name'", (err, results) => {
    if (err) return;
    if (!results || results.length === 0) {
      db.query("ALTER TABLE assembly ADD COLUMN product_name VARCHAR(255) NULL AFTER assembly_no");
    }
  });

  db.query("SHOW COLUMNS FROM assembly LIKE 'bom_ref'", (err, results) => {
    if (err) return;
    if (!results || results.length === 0) {
      db.query("ALTER TABLE assembly ADD COLUMN bom_ref VARCHAR(100) NULL AFTER product_name");
    }
  });
};

ensureAssemblyColumns();

router.get("/", (req, res) => {
  db.query(
    `SELECT
       a.id,
       a.assembly_no,
       COALESCE(NULLIF(a.product_name, ''), p.product_name) AS product_name,
       COALESCE(NULLIF(a.bom_ref, ''), CASE WHEN a.bom_id IS NOT NULL THEN CONCAT('BOM-', a.bom_id) ELSE '' END) AS bom_ref,
       a.assembly_date,
       a.qty_assembled,
       a.warehouse,
       a.remarks,
       a.created_at
     FROM assembly a
     LEFT JOIN products p ON p.id = a.product_id
     ORDER BY a.id DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

router.post("/", (req, res) => {
  const { assembly_no, product_name, bom_ref, assembly_date, qty_assembled, warehouse, remarks } = req.body;
  if (!assembly_no) return res.status(400).json({ error: "Assembly no zaroori hai!" });
  const today = new Date().toISOString().slice(0, 10);
  db.query(
    `INSERT INTO assembly (assembly_no, product_name, bom_ref, assembly_date, qty_assembled, warehouse, remarks) VALUES (?,?,?,?,?,?,?)`,
    [
      assembly_no,
      product_name || null,
      bom_ref || null,
      assembly_date || today,
      parseFloat(qty_assembled) || 0,
      warehouse || null,
      remarks || null,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Assembly save ho gayi!", id: result.insertId });
    }
  );
});

router.put("/:id", (req, res) => {
  const { assembly_no, product_name, bom_ref, assembly_date, qty_assembled, warehouse, remarks } = req.body;
  if (!assembly_no) return res.status(400).json({ error: "Assembly no zaroori hai!" });
  const today = new Date().toISOString().slice(0, 10);
  db.query(
    `UPDATE assembly
     SET assembly_no = ?, product_name = ?, bom_ref = ?, assembly_date = ?, qty_assembled = ?, warehouse = ?, remarks = ?
     WHERE id = ?`,
    [
      assembly_no,
      product_name || null,
      bom_ref || null,
      assembly_date || today,
      parseFloat(qty_assembled) || 0,
      warehouse || null,
      remarks || null,
      req.params.id,
    ],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Assembly update ho gayi!" });
    }
  );
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM assembly WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted!" });
  });
});

module.exports = router;
