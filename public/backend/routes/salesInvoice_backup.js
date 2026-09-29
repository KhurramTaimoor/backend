const express = require("express");
const router = express.Router();
const db = require("../db");

// GET - Sab invoices lao (customer aur salesman ka naam bhi)
router.get("/", (req, res) => {
  const query = `
    SELECT 
      si.id,
      si.invoice_no,
      si.date,
      si.invoice_date,
      si.discount,
      si.net_total,
      si.gross_amount,
      si.created_at,
      c.name AS customer_name,
      s.name AS salesman_name
    FROM sale_invoices si
    LEFT JOIN customers c ON si.customer_id = c.id
    LEFT JOIN salesmen s ON si.salesman_id = s.id
    ORDER BY si.id DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST - Naya invoice save karo
router.post("/", (req, res) => {
  const {
    invoice_no,
    customer_id,
    invoice_date,
    salesman_id,
    gross_amount,
    discount,
    net_total,
  } = req.body;

  // Validation
  if (!invoice_no || !customer_id || !salesman_id) {
    return res.status(400).json({ error: "invoice_no, customer_id, aur salesman_id zaroori hain!" });
  }

  const gross = parseFloat(gross_amount) || 0;
  const disc = parseFloat(discount) || 0;
  const net = gross > 0 || disc > 0
    ? Math.max(gross - disc, 0).toFixed(2)
    : (parseFloat(net_total) || 0).toFixed(2);

  const today = new Date().toISOString().slice(0, 10);

  db.query(
    `INSERT INTO sale_invoices 
      (invoice_no, customer_id, invoice_date, date, salesman_id, gross_amount, discount, net_total) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [invoice_no, customer_id, invoice_date || today, today, salesman_id, gross, disc, net],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "✅ Invoice save ho gaya!", id: result.insertId });
    }
  );
});

// PUT - Invoice update karo
router.put("/:id", (req, res) => {
  const {
    invoice_no,
    customer_id,
    invoice_date,
    salesman_id,
    gross_amount,
    discount,
    net_total,
  } = req.body;

  const gross = parseFloat(gross_amount) || 0;
  const disc = parseFloat(discount) || 0;
  const net = Math.max(gross - disc, 0).toFixed(2);

  db.query(
    `UPDATE sale_invoices SET 
      invoice_no = ?, customer_id = ?, invoice_date = ?, 
      salesman_id = ?, gross_amount = ?, discount = ?, net_total = ?
     WHERE id = ?`,
    [invoice_no, customer_id, invoice_date, salesman_id, gross, disc, net, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "✅ Invoice update ho gaya!" });
    }
  );
});

// DELETE - Invoice delete karo
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM sale_invoices WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "✅ Invoice delete ho gaya!" });
  });
});

