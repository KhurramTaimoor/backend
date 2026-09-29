const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const { from_date, to_date, account_id } = req.query;
  const id = parseInt(account_id) || 0;
  let query = `
    SELECT 
      DATE_FORMAT(jv.voucher_date, '%d/%m/%Y') AS date,
      jv.narration AS description,
      jv.voucher_no AS ref,
      CASE WHEN jv.account_dr_id = ? THEN jv.amount ELSE 0 END AS debit,
      CASE WHEN jv.account_cr_id = ? THEN jv.amount ELSE 0 END AS credit
    FROM journal_vouchers jv
    WHERE (jv.account_dr_id = ? OR jv.account_cr_id = ?)
  `;
  const params = [id, id, id, id];
  if (from_date) { query += " AND DATE(jv.voucher_date) >= DATE(?)"; params.push(from_date); }
  if (to_date) { query += " AND DATE(jv.voucher_date) <= DATE(?)"; params.push(to_date); }
  query += " ORDER BY jv.voucher_date ASC";
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
