const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const sql = `
    SELECT 
      p.id,
      p.product_name,
      pt.type_name,
      c.category_name,
      COALESCE(os.opening_qty, 0)  AS opening_qty,
      COALESCE(os.rate, 0)         AS rate,
      COALESCE(sr.received_qty, 0) AS received_qty,
      COALESCE(si.issued_qty, 0)   AS issued_qty,
      (COALESCE(os.opening_qty, 0) + COALESCE(sr.received_qty, 0) - COALESCE(si.issued_qty, 0)) AS balance_qty,
      ((COALESCE(os.opening_qty, 0) + COALESCE(sr.received_qty, 0) - COALESCE(si.issued_qty, 0)) * COALESCE(os.rate, 0)) AS total_value
    FROM products p
    LEFT JOIN product_types pt ON p.product_type_id = pt.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN (
      SELECT product_id, SUM(quantity) AS opening_qty, AVG(rate) AS rate
      FROM opening_stock GROUP BY product_id
    ) os ON p.id = os.product_id
    LEFT JOIN (
      SELECT product_id, SUM(received_qty) AS received_qty
      FROM stock_receive GROUP BY product_id
    ) sr ON p.id = sr.product_id
    LEFT JOIN (
      SELECT product_id, SUM(issued_qty) AS issued_qty
      FROM stock_issue GROUP BY product_id
    ) si ON p.id = si.product_id
    ORDER BY p.product_name
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
