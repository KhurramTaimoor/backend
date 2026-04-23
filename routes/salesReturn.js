const express = require("express");
const router  = express.Router();
const db      = require("../db");

// ══════════════════════════════════════════════════════════════════════════════
// SALES RETURNS ROUTES  —  Frontend: SalesReturnPage.jsx
// app.js mein:  app.use("/api/sales-returns", require("./routes/salesReturnRoutes"));
//
// Table: sales_returns
//   id              INT AUTO_INCREMENT PRIMARY KEY
//   return_no       VARCHAR(100) NOT NULL
//   invoice_ref     VARCHAR(100) DEFAULT ''
//   product_id      INT NULL (FK to sales_rates.id)
//   product_name    VARCHAR(255) DEFAULT ''
//   return_date     DATE NULL
//   sale_order_date DATE NULL
//   return_qty      DECIMAL(10,2) DEFAULT 0
//   rate            DECIMAL(10,2) DEFAULT 0
//   return_amount   DECIMAL(10,2) DEFAULT 0
//   reason          TEXT DEFAULT ''
//   created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// ══════════════════════════════════════════════════════════════════════════════

// ── GET ALL ───────────────────────────────────────────────────────────────────
router.get("/", (req, res) => {
  const query = `
    SELECT
      sr.id,
      sr.return_no,
      sr.invoice_ref,
      sr.product_id,
      sr.product_name,
      DATE_FORMAT(sr.return_date,       '%Y-%m-%d') AS return_date,
      DATE_FORMAT(sr.sale_order_date,   '%Y-%m-%d') AS sale_order_date,
      sr.return_qty,
      sr.rate,
      sr.return_amount,
      sr.reason
    FROM sales_returns sr
    ORDER BY sr.id DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ── CREATE ────────────────────────────────────────────────────────────────────
router.post("/", (req, res) => {
  console.log("👉 CREATE SALES RETURN:", req.body);

  const {
    return_no, invoice_ref, product_id, product_name,
    return_date, sale_order_date,
    return_qty, rate, reason,
  } = req.body;

  if (!return_no?.trim()) {
    return res.status(400).json({ error: "return_no zaroori hai!" });
  }

  const qty      = parseFloat(return_qty) || 0;
  const itemRate = parseFloat(rate)       || 0;
  const amount   = (qty * itemRate).toFixed(2);
  const today    = new Date().toISOString().slice(0, 10);

  db.query(
    `INSERT INTO sales_returns
     (return_no, invoice_ref, product_id, product_name, return_date, sale_order_date, return_qty, rate, return_amount, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      return_no.trim(),
      invoice_ref?.trim()  || "",
      product_id           || null,
      product_name?.trim() || "",
      return_date          || today,
      sale_order_date      || null,
      qty,
      itemRate,
      amount,
      reason?.trim()       || "",
    ],
    (err, result) => {
      if (err) {
        console.log("❌ DB ERROR:", err.message);
        return res.status(500).json({ error: err.message });
      }

      // Full record wapas bhejo — frontend: const created = res?.data || res
      const newId = result.insertId;
      db.query(
        `SELECT id, return_no, invoice_ref, product_id, product_name,
                DATE_FORMAT(return_date,     '%Y-%m-%d') AS return_date,
                DATE_FORMAT(sale_order_date, '%Y-%m-%d') AS sale_order_date,
                return_qty, rate, return_amount, reason
         FROM sales_returns WHERE id = ?`,
        [newId],
        (err2, rows) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.status(201).json({ message: "Sales return save ho gaya!", data: rows[0] });
        }
      );
    }
  );
});

// ── UPDATE ────────────────────────────────────────────────────────────────────
router.put("/:id", (req, res) => {
  console.log("👉 UPDATE SALES RETURN:", req.body);

  const {
    return_no, invoice_ref, product_id, product_name,
    return_date, sale_order_date,
    return_qty, rate, reason,
  } = req.body;

  if (!return_no?.trim()) {
    return res.status(400).json({ error: "return_no zaroori hai!" });
  }

  const qty      = parseFloat(return_qty) || 0;
  const itemRate = parseFloat(rate)       || 0;
  const amount   = (qty * itemRate).toFixed(2);
  const today    = new Date().toISOString().slice(0, 10);

  db.query(
    `UPDATE sales_returns
     SET return_no = ?, invoice_ref = ?, product_id = ?, product_name = ?,
         return_date = ?, sale_order_date = ?,
         return_qty = ?, rate = ?, return_amount = ?, reason = ?
     WHERE id = ?`,
    [
      return_no.trim(),
      invoice_ref?.trim()  || "",
      product_id           || null,
      product_name?.trim() || "",
      return_date          || today,
      sale_order_date      || null,
      qty,
      itemRate,
      amount,
      reason?.trim()       || "",
      req.params.id,
    ],
    (err) => {
      if (err) {
        console.log("❌ DB ERROR:", err.message);
        return res.status(500).json({ error: err.message });
      }

      // Updated record wapas bhejo — frontend: const updated = res?.data || res
      db.query(
        `SELECT id, return_no, invoice_ref, product_id, product_name,
                DATE_FORMAT(return_date,     '%Y-%m-%d') AS return_date,
                DATE_FORMAT(sale_order_date, '%Y-%m-%d') AS sale_order_date,
                return_qty, rate, return_amount, reason
         FROM sales_returns WHERE id = ?`,
        [req.params.id],
        (err2, rows) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ message: "Sales return update ho gaya!", data: rows[0] });
        }
      );
    }
  );
});

// ── DELETE ────────────────────────────────────────────────────────────────────
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM sales_returns WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Sales return delete ho gaya!" });
  });
});

module.exports = router;