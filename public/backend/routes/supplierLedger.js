const express = require("express");
const router = express.Router();
const db = require("../db");

const toNum = (v) => parseFloat(v || 0) || 0;

router.get("/suppliers", (req, res) => {
  db.query("SELECT id, name FROM suppliers ORDER BY name ASC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get("/", (req, res) => {
  const { supplier_id, from_date, to_date } = req.query;
  if (!supplier_id) return res.status(400).json({ error: "supplier_id required" });

  db.query("SELECT id, name, opening_balance, created_at FROM suppliers WHERE id = ? LIMIT 1", [supplier_id], (err, suppliers) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!suppliers.length) return res.status(404).json({ error: "Supplier not found" });

    const supplier = suppliers[0];

    let purchaseSql = `
      SELECT
        pi.id,
        pi.invoice_no AS ref_no,
        pi.invoice_date AS tx_date,
        pi.total_amount AS amount,
        pi.status
      FROM purchase_invoices pi
      WHERE pi.supplier_id = ?
    `;
    const purchaseParams = [supplier_id];
    if (from_date) {
      purchaseSql += " AND DATE(pi.invoice_date) >= DATE(?)";
      purchaseParams.push(from_date);
    }
    if (to_date) {
      purchaseSql += " AND DATE(pi.invoice_date) <= DATE(?)";
      purchaseParams.push(to_date);
    }

    let returnSql = `
      SELECT
        pr.id,
        pi.invoice_no AS ref_no,
        pr.return_date AS tx_date,
        pr.total_amount AS amount
      FROM purchase_returns pr
      INNER JOIN purchase_invoices pi ON pi.id = pr.invoice_id
      WHERE pi.supplier_id = ?
    `;
    const returnParams = [supplier_id];
    if (from_date) {
      returnSql += " AND DATE(pr.return_date) >= DATE(?)";
      returnParams.push(from_date);
    }
    if (to_date) {
      returnSql += " AND DATE(pr.return_date) <= DATE(?)";
      returnParams.push(to_date);
    }

    purchaseSql += " ORDER BY pi.invoice_date ASC, pi.id ASC";
    returnSql += " ORDER BY pr.return_date ASC, pr.id ASC";

    db.query(purchaseSql, purchaseParams, (pErr, purchases) => {
      if (pErr) return res.status(500).json({ error: pErr.message });

      db.query(returnSql, returnParams, (rErr, returns) => {
        if (rErr) return res.status(500).json({ error: rErr.message });

        const transactions = [];
        const opening = toNum(supplier.opening_balance);

        transactions.push({
          id: "opening",
          tx_date: supplier.created_at ? new Date(supplier.created_at).toISOString().slice(0, 10) : null,
          type: "opening",
          ref_no: "Opening Balance",
          debit: opening,
          credit: 0,
          status: "",
        });

        purchases.forEach((row) => {
          transactions.push({
            id: `p-${row.id}`,
            tx_date: row.tx_date ? new Date(row.tx_date).toISOString().slice(0, 10) : null,
            type: "purchase",
            ref_no: row.ref_no || "-",
            debit: toNum(row.amount),
            credit: 0,
            status: row.status || "",
          });
        });

        returns.forEach((row) => {
          transactions.push({
            id: `r-${row.id}`,
            tx_date: row.tx_date ? new Date(row.tx_date).toISOString().slice(0, 10) : null,
            type: "return",
            ref_no: row.ref_no || "-",
            debit: 0,
            credit: toNum(row.amount),
            status: "",
          });
        });

        transactions.sort((a, b) => {
          if (a.id === "opening") return -1;
          if (b.id === "opening") return 1;
          const da = a.tx_date || "0000-00-00";
          const dbb = b.tx_date || "0000-00-00";
          if (da < dbb) return -1;
          if (da > dbb) return 1;
          return String(a.id).localeCompare(String(b.id));
        });

        let running = 0;
        const finalRows = transactions.map((row) => {
          running += toNum(row.debit) - toNum(row.credit);
          return { ...row, balance: running };
        });

        const totalDebit = finalRows.reduce((sum, row) => sum + toNum(row.debit), 0);
        const totalCredit = finalRows.reduce((sum, row) => sum + toNum(row.credit), 0);

        res.json({
          supplier: {
            id: supplier.id,
            name: supplier.name,
            opening_balance: opening,
          },
          summary: {
            total_debit: totalDebit,
            total_credit: totalCredit,
            closing_balance: running,
          },
          transactions: finalRows,
        });
      });
    });
  });
});

module.exports = router;
