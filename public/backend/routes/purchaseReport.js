const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const { from_date, to_date, supplier_id } = req.query;
  let query = `
    SELECT 
      pi.id,
      pi.invoice_no,
      DATE_FORMAT(pi.invoice_date, '%d/%m/%Y') AS invoice_date,
      pi.total_amount,
      pi.status,
      s.name AS supplier_name
    FROM purchase_invoices pi
    LEFT JOIN suppliers s ON pi.supplier_id = s.id
    WHERE 1=1
  `;
  const params = [];
  if (from_date) { query += " AND DATE(pi.invoice_date) >= DATE(?)"; params.push(from_date); }
  if (to_date) { query += " AND DATE(pi.invoice_date) <= DATE(?)"; params.push(to_date); }
  if (supplier_id) { query += " AND pi.supplier_id = ?"; params.push(supplier_id); }
  query += " ORDER BY pi.id DESC";
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
