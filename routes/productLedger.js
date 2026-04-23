const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all products for dropdown
router.get("/products", (req, res) => {
  db.query("SELECT id, product_name FROM products ORDER BY product_name", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// GET ledger for a specific product
router.get("/:product_id", (req, res) => {
  const pid = req.params.product_id;
  const sql = `
    SELECT * FROM (
      SELECT 
        os.stock_date AS date,
        'Opening Stock' AS description,
        'OPEN' AS type,
        '-' AS ref,
        os.quantity AS debit,
        0 AS credit
      FROM opening_stock os WHERE os.product_id = ?

      UNION ALL

      SELECT
        sr.receive_date AS date,
        CONCAT('Stock Receive - ', COALESCE(sr.supplier, '')) AS description,
        'DR' AS type,
        sr.grn_no AS ref,
        sr.received_qty AS debit,
        0 AS credit
      FROM stock_receive sr WHERE sr.product_id = ?

      UNION ALL

      SELECT
        si.date AS date,
        CONCAT('Stock Issue - ', COALESCE(d.department_name, '')) AS description,
        'CR' AS type,
        si.issue_no AS ref,
        0 AS debit,
        si.issued_qty AS credit
      FROM stock_issue si
      LEFT JOIN departments d ON si.department_id = d.id
      WHERE si.product_id = ?
    ) AS ledger
    ORDER BY date ASC
  `;
  db.query(sql, [pid, pid, pid], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
