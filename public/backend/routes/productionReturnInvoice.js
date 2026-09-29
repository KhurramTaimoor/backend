const express = require("express");
const router = express.Router();
const db = require("../db");

const ensureProductionReturnSchema = () => {
  db.query("SHOW TABLES LIKE 'production_returns'", (err, tables) => {
    if (err) return;
    if (!tables || tables.length === 0) {
      db.query(
        `CREATE TABLE IF NOT EXISTS production_returns (
          id INT AUTO_INCREMENT PRIMARY KEY,
          return_no VARCHAR(100) UNIQUE,
          return_date DATE,
          batch_no VARCHAR(100),
          product VARCHAR(255),
          quantity_returned DECIMAL(10,2) DEFAULT 0,
          warehouse VARCHAR(255),
          reason VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      );
    }
  });
};

ensureProductionReturnSchema();

router.get("/", (req, res) => {
  db.query(
    `SELECT
      id,
      return_no,
      return_date,
      batch_no,
      product,
      quantity_returned,
      warehouse,
      reason,
      created_at
    FROM production_returns
    ORDER BY id DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

router.post("/", (req, res) => {
  const { return_no, return_date, batch_no, product, quantity_returned, warehouse, reason } = req.body;
  if (!return_no) return res.status(400).json({ error: "Return no zaroori hai!" });
  const today = new Date().toISOString().slice(0, 10);

  db.query(
    `INSERT INTO production_returns
     (return_no, return_date, batch_no, product, quantity_returned, warehouse, reason)
     VALUES (?,?,?,?,?,?,?)`,
    [
      return_no,
      return_date || today,
      batch_no || null,
      product || null,
      parseFloat(quantity_returned) || 0,
      warehouse || null,
      reason || null,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Production return save ho gaya!", id: result.insertId });
    }
  );
});

router.put("/:id", (req, res) => {
  const { return_no, return_date, batch_no, product, quantity_returned, warehouse, reason } = req.body;
  if (!return_no) return res.status(400).json({ error: "Return no zaroori hai!" });
  const today = new Date().toISOString().slice(0, 10);

  db.query(
    `UPDATE production_returns
     SET return_no = ?, return_date = ?, batch_no = ?, product = ?, quantity_returned = ?, warehouse = ?, reason = ?
     WHERE id = ?`,
    [
      return_no,
      return_date || today,
      batch_no || null,
      product || null,
      parseFloat(quantity_returned) || 0,
      warehouse || null,
      reason || null,
      req.params.id,
    ],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Production return update ho gaya!" });
    }
  );
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM production_returns WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted!" });
  });
});

module.exports = router;
