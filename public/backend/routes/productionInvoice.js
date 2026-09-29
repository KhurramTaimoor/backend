const express = require("express");
const router = express.Router();
const db = require("../db");

const ensureProductionInvoiceSchema = () => {
  db.query("SHOW TABLES LIKE 'production_invoices'", (err, tables) => {
    if (err) return;

    if (!tables || tables.length === 0) {
      db.query(
        `CREATE TABLE IF NOT EXISTS production_invoices (
          id INT AUTO_INCREMENT PRIMARY KEY,
          batch_no VARCHAR(100) UNIQUE,
          production_date DATE,
          product VARCHAR(255),
          product_id INT NULL,
          quantity_produced DECIMAL(10,2) DEFAULT 0,
          qty_produced DECIMAL(10,2) DEFAULT 0,
          warehouse VARCHAR(255),
          supervisor VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      );
      return;
    }

    db.query("SHOW COLUMNS FROM production_invoices LIKE 'product'", (e1, r1) => {
      if (!e1 && (!r1 || r1.length === 0)) {
        db.query("ALTER TABLE production_invoices ADD COLUMN product VARCHAR(255) NULL AFTER production_date");
      }
    });

    db.query("SHOW COLUMNS FROM production_invoices LIKE 'quantity_produced'", (e2, r2) => {
      if (!e2 && (!r2 || r2.length === 0)) {
        db.query("ALTER TABLE production_invoices ADD COLUMN quantity_produced DECIMAL(10,2) NULL AFTER product_id");
      }
    });

    db.query("SHOW COLUMNS FROM production_invoices LIKE 'qty_produced'", (e3, r3) => {
      if (!e3 && (!r3 || r3.length === 0)) {
        db.query("ALTER TABLE production_invoices ADD COLUMN qty_produced DECIMAL(10,2) NULL AFTER quantity_produced");
      }
    });
  });
};

ensureProductionInvoiceSchema();

router.get("/", (req, res) => {
  db.query(
    `SELECT
      pi.id,
      pi.batch_no,
      pi.production_date,
      COALESCE(NULLIF(pi.product, ''), p.product_name) AS product,
      COALESCE(pi.quantity_produced, pi.qty_produced, 0) AS quantity_produced,
      pi.warehouse,
      pi.supervisor,
      pi.created_at
    FROM production_invoices pi
    LEFT JOIN products p ON p.id = pi.product_id
    ORDER BY pi.id DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

router.post("/", (req, res) => {
  const { batch_no, production_date, product, quantity_produced, warehouse, supervisor } = req.body;
  if (!batch_no) return res.status(400).json({ error: "Batch no zaroori hai!" });
  const today = new Date().toISOString().slice(0, 10);
  const qty = parseFloat(quantity_produced) || 0;

  db.query("SELECT id FROM products WHERE product_name = ? LIMIT 1", [product || ""], (lookupErr, rows) => {
    if (lookupErr) return res.status(500).json({ error: lookupErr.message });
    const productId = rows && rows[0] ? rows[0].id : null;

    db.query(
      `INSERT INTO production_invoices
       (batch_no, production_date, product, product_id, quantity_produced, qty_produced, warehouse, supervisor)
       VALUES (?,?,?,?,?,?,?,?)`,
      [batch_no, production_date || today, product || null, productId, qty, qty, warehouse || null, supervisor || null],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Production invoice save ho gayi!", id: result.insertId });
      }
    );
  });
});

router.put("/:id", (req, res) => {
  const { batch_no, production_date, product, quantity_produced, warehouse, supervisor } = req.body;
  if (!batch_no) return res.status(400).json({ error: "Batch no zaroori hai!" });
  const today = new Date().toISOString().slice(0, 10);
  const qty = parseFloat(quantity_produced) || 0;

  db.query("SELECT id FROM products WHERE product_name = ? LIMIT 1", [product || ""], (lookupErr, rows) => {
    if (lookupErr) return res.status(500).json({ error: lookupErr.message });
    const productId = rows && rows[0] ? rows[0].id : null;

    db.query(
      `UPDATE production_invoices
       SET batch_no = ?, production_date = ?, product = ?, product_id = ?, quantity_produced = ?, qty_produced = ?, warehouse = ?, supervisor = ?
       WHERE id = ?`,
      [batch_no, production_date || today, product || null, productId, qty, qty, warehouse || null, supervisor || null, req.params.id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Production invoice update ho gayi!" });
      }
    );
  });
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM production_invoices WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted!" });
  });
});

module.exports = router;
