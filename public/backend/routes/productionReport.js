const express = require("express");
const router = express.Router();
const db = require("../db");

const ensureStatusColumn = () => {
  db.query("SHOW COLUMNS FROM production_invoices LIKE 'status'", (err, rows) => {
    if (err) return;
    if (!rows || rows.length === 0) {
      db.query("ALTER TABLE production_invoices ADD COLUMN status VARCHAR(50) NULL AFTER supervisor");
    }
  });
};

ensureStatusColumn();

router.get("/", (req, res) => {
  const { from_date, to_date, product, status } = req.query;

  let query = `
    SELECT
      id,
      batch_no,
      DATE_FORMAT(production_date, '%d/%m/%Y') AS production_date,
      COALESCE(product, '') AS product,
      COALESCE(quantity_produced, qty_produced, 0) AS quantity_produced,
      COALESCE(warehouse, '') AS warehouse,
      COALESCE(supervisor, '') AS supervisor,
      COALESCE(status, '') AS status
    FROM production_invoices
    WHERE 1=1
  `;

  const params = [];

  if (from_date) {
    query += " AND DATE(production_date) >= DATE(?)";
    params.push(from_date);
  }

  if (to_date) {
    query += " AND DATE(production_date) <= DATE(?)";
    params.push(to_date);
  }

  if (product) {
    query += " AND product LIKE ?";
    params.push(`%${product}%`);
  }

  if (status) {
    query += " AND status = ?";
    params.push(status);
  }

  query += " ORDER BY id DESC";

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
