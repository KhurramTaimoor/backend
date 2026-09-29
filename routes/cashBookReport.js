const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const { from_date, to_date, account_id } = req.query;

  if (!from_date || !to_date) {
    return res.status(400).json({ error: "from_date aur to_date zaroori hain" });
  }

  const openingSQL = `
    SELECT 
      COALESCE(SUM(CASE WHEN type='debit' THEN amount ELSE 0 END), 0) AS total_debit,
      COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END), 0) AS total_credit
    FROM cash_book
    WHERE DATE(date) < ?
    ${account_id ? "AND account_id = ?" : ""}
  `;

  const txnSQL = `
    SELECT cb.*, c.name AS account_name
    FROM cash_book cb
    LEFT JOIN chart_of_accounts c ON cb.account_id = c.id
    WHERE DATE(cb.date) BETWEEN ? AND ?
    ${account_id ? "AND cb.account_id = ?" : ""}
    ORDER BY cb.date ASC, cb.id ASC
  `;

  const openingParams = account_id ? [from_date, account_id] : [from_date];
  const txnParams = account_id ? [from_date, to_date, account_id] : [from_date, to_date];

  db.query(openingSQL, openingParams, (err, openingResult) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query(txnSQL, txnParams, (err2, transactions) => {
      if (err2) return res.status(500).json({ error: err2.message });

      const openingDebit = Number(openingResult[0].total_debit);
      const openingCredit = Number(openingResult[0].total_credit);
      const openingBalance = openingDebit - openingCredit;

      let runningBalance = openingBalance;
      const rows = transactions.map(t => {
        const debit = Number(t.type === "debit" ? t.amount : 0);
        const credit = Number(t.type === "credit" ? t.amount : 0);
        runningBalance += debit - credit;
        return { ...t, debit, credit, balance: runningBalance };
      });

      const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
      const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
      const closingBalance = openingBalance + totalDebit - totalCredit;

      res.json({
        opening_balance: openingBalance,
        transactions: rows,
        total_debit: totalDebit,
        total_credit: totalCredit,
        closing_balance: closingBalance
      });
    });
  });
});

module.exports = router;
