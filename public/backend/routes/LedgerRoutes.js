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

router.get("/", async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    const invoiceWhere = [];
    const invoiceParams = [];

    const returnWhere = [];
    const returnParams = [];

    if (from_date) {
      invoiceWhere.push("si.invoice_date >= ?");
      invoiceParams.push(from_date);

      returnWhere.push("sr.return_date >= ?");
      returnParams.push(from_date);
    }

    if (to_date) {
      invoiceWhere.push("si.invoice_date <= ?");
      invoiceParams.push(to_date);

      returnWhere.push("sr.return_date <= ?");
      returnParams.push(to_date);
    }

    const invoiceWhereSql = invoiceWhere.length
      ? `WHERE ${invoiceWhere.join(" AND ")}`
      : "";

    const returnWhereSql = returnWhere.length
      ? `WHERE ${returnWhere.join(" AND ")}`
      : "";

    // 1) Sales Invoices
    const invoices = await runQuery(
      `
      SELECT
        CONCAT('INV-', si.id) AS id,
        DATE_FORMAT(si.invoice_date, '%Y-%m-%d') AS date,
        si.customer_id,
        COALESCE(c.customer_name_en, '—') AS customer_name,
        'Sale Invoice' AS voucher_type,
        CONCAT('Sale Invoice - ', si.invoice_no) AS description,
        si.invoice_no AS ref,
        COALESCE(si.previous_balance, 0) AS opening_balance,
        COALESCE(si.grand_total, 0) AS debit,
        0 AS credit,
        2 AS sort_order
      FROM sales_invoices si
      LEFT JOIN customers c ON c.id = si.customer_id
      ${invoiceWhereSql}
      ORDER BY si.invoice_date ASC, si.id ASC
      `,
      invoiceParams
    );

    // 2) Sales Returns
    // invoice_ref ko invoice_no se match kar rahe hain
    const returns = await runQuery(
      `
      SELECT
        CONCAT('RET-', sr.id) AS id,
        DATE_FORMAT(sr.return_date, '%Y-%m-%d') AS date,
        si.customer_id,
        COALESCE(c.customer_name_en, '—') AS customer_name,
        'Sale Return' AS voucher_type,
        CONCAT('Sale Return - ', sr.return_no) AS description,
        sr.return_no AS ref,
        0 AS opening_balance,
        0 AS debit,
        COALESCE(sr.return_amount, 0) AS credit,
        3 AS sort_order
      FROM sales_returns sr
      LEFT JOIN sales_invoices si
        ON si.invoice_no = sr.invoice_ref
      LEFT JOIN customers c
        ON c.id = si.customer_id
      ${returnWhereSql}
      ORDER BY sr.return_date ASC, sr.id ASC
      `,
      returnParams
    );

    // 3) Opening balance rows per customer
    const openingMap = new Map();

    invoices.forEach((row) => {
      const customerId = row.customer_id || 0;
      const customerName = row.customer_name || "—";
      const ob = toNumber(row.opening_balance);

      if (!ob) return;
      if (openingMap.has(customerId)) return;

      openingMap.set(customerId, {
        id: `OB-${customerId}`,
        date: from_date || row.date || "",
        customer_id: customerId,
        customer_name: customerName,
        voucher_type: "Opening Balance",
        description: "Opening balance carried forward",
        ref: "OB",
        opening_balance: ob,
        debit: ob > 0 ? ob : 0,
        credit: ob < 0 ? Math.abs(ob) : 0,
        sort_order: 1,
      });
    });

    const openingRows = Array.from(openingMap.values());

    // 4) Combine and sort
    const combined = [...openingRows, ...invoices, ...returns].sort((a, b) => {
      const da = new Date(a.date || "1970-01-01").getTime();
      const db = new Date(b.date || "1970-01-01").getTime();

      if (da !== db) return da - db;

      if ((a.sort_order || 99) !== (b.sort_order || 99)) {
        return (a.sort_order || 99) - (b.sort_order || 99);
      }

      return String(a.ref || "").localeCompare(String(b.ref || ""));
    });

    // 5) Running balance
    let runningBalance = 0;

    const ledger = combined.map((row) => {
      const debit = toNumber(row.debit);
      const credit = toNumber(row.credit);

      runningBalance += debit - credit;

      return {
        ...row,
        debit,
        credit,
        balance: runningBalance,
      };
    });

    // 6) Response
    res.json({
      message: "Ledger fetched successfully",
      data: ledger,
    });
  } catch (err) {
    console.error("GET /ledger:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;