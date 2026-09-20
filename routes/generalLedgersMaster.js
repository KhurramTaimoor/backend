const express = require("express");
const router = express.Router();
const db = require("../db");

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

// Master list used by Sales Invoice / Sales Return party dropdowns.
// Prefer the legacy general_ledgers table when it has records; otherwise expose
// Chart of Accounts using the same display fields so existing accounting data is reusable.
router.get("/", async (_req, res) => {
  try {
    let rows = [];
    try {
      rows = await query(
        `SELECT id,
                COALESCE(NULLIF(ledger_name,''), NULLIF(account_title,''), CONCAT('Ledger #', id)) AS ledger_name,
                account_title,
                account_code,
                COALESCE(opening_balance,0) AS opening_balance
         FROM general_ledgers
         ORDER BY id DESC`
      );
    } catch (_) {
      rows = [];
    }

    if (!rows.length) {
      rows = await query(
        `SELECT id,
                account_title AS ledger_name,
                account_title,
                account_code,
                COALESCE(opening_balance,0) AS opening_balance
         FROM chart_of_accounts
         ORDER BY account_title ASC`
      ).catch(() => []);
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
