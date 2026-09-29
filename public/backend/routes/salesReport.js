const express = require("express");
const router = express.Router();
const db = require("../db");

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// GET /api/sales-report
router.get("/", async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    const conditions = [];
    const params = [];

    if (from_date) {
      conditions.push("report_date >= ?");
      params.push(from_date);
    }

    if (to_date) {
      conditions.push("report_date <= ?");
      params.push(to_date);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const sql = `
      SELECT *
      FROM (
        -- SALES INVOICES
        SELECT
          si.id,
          'invoice' AS entry_type,
          si.invoice_no AS reference_no,
          DATE_FORMAT(si.invoice_date, '%Y-%m-%d') AS report_date,
          COALESCE(si.invoice_total, 0) AS gross_amount,
          COALESCE(si.invoice_total, 0) - COALESCE(si.grand_total, 0) AS discount,
          COALESCE(si.grand_total, 0) AS net_total
        FROM sales_invoices si

        UNION ALL

        -- SALE ORDERS
        SELECT
          so.id,
          'order' AS entry_type,
          so.order_no AS reference_no,
          DATE_FORMAT(so.order_date, '%Y-%m-%d') AS report_date,
          COALESCE(so.total_amount, 0) AS gross_amount,
          0 AS discount,
          COALESCE(so.total_amount, 0) AS net_total
        FROM sale_orders so

        UNION ALL

        -- SALES RETURNS
        SELECT
          sr.id,
          'return' AS entry_type,
          sr.return_no AS reference_no,
          DATE_FORMAT(sr.return_date, '%Y-%m-%d') AS report_date,
          COALESCE(sr.return_amount, 0) AS gross_amount,
          0 AS discount,
          COALESCE(sr.return_amount, 0) * -1 AS net_total
        FROM sales_returns sr
      ) AS combined_report
      ${whereClause}
      ORDER BY report_date DESC, id DESC
    `;

    const rows = await runQuery(sql, params);

    const mapped = rows.map((row) => ({
      ...row,
      gross_amount: toNumber(row.gross_amount),
      discount: toNumber(row.discount),
      net_total: toNumber(row.net_total),
    }));

    res.json(mapped);
  } catch (err) {
    console.error("GET /sales-report:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;